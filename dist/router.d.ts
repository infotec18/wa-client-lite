import { Request, Response } from "express";
declare class AppRouter {
    readonly router: import("express-serve-static-core").Router;
    constructor();
    loadMessages(req: Request, res: Response): Promise<void>;
    sendMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getProfilePic(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getFile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    healthCheck(_: Request, res: Response): Promise<void>;
    getClientStatus(_: Request, res: Response): Promise<void>;
    uploadFile(req: Request, res: Response): Promise<void>;
    sendMassMessages(req: Request, res: Response): Promise<void>;
    validateNumber(req: Request, res: Response): Promise<void>;
}
export default AppRouter;
//# sourceMappingURL=router.d.ts.map