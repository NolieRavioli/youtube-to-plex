import type { NextApiRequest, NextApiResponse } from 'next';

export function generateError(req: NextApiRequest, res: NextApiResponse, subject: string, error: unknown) {
    const upstream = error as {
        response?: {
            status?: number;
            data?: {
                error?: string;
                message?: string;
                stack?: string;
                error_stack?: string;
            } | string;
        };
        message?: string;
        stack?: string;
    };

    let action: string;
    switch (req.method) {
        case "POST":
            action = "create";
            break;
        case "PUT":
            action = "update";
            break;
        case "DELETE":
            action = "delete";
            break;
        default:
        case "GET":
            action = 'load';
            break;
    }

    const upstreamStatus = upstream.response?.status;
    const status = typeof upstreamStatus === 'number' && upstreamStatus >= 400 && upstreamStatus <= 599
        ? upstreamStatus
        : 400;

    const responseData = upstream.response?.data;
    if (typeof responseData === 'string' && responseData.trim()) {
        return res.status(status).json({ error: responseData });
    }

    const upstreamMessage = responseData && typeof responseData === 'object'
        ? responseData.error || responseData.message
        : undefined;
    const upstreamStack = responseData && typeof responseData === 'object'
        ? responseData.stack || responseData.error_stack
        : undefined;

    if (typeof error === 'string')
        return res.status(status).json({ error });

    if (typeof upstreamMessage === 'string' && upstreamMessage.trim()) {
        return res.status(status).json({
            error: upstreamMessage,
            error_stack: typeof upstreamStack === 'string' ? upstreamStack : undefined
        });
    }

    if (error instanceof Error && typeof error.message === 'string') {
        return res.status(status).json({
            error: error.message,
            error_stack: error.stack
        });
    }

    return res.status(status).json({ error: `Could not ${action} ${subject}` });
}
