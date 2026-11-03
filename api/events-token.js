import { auth, events } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
    try {
        const user = await auth.getUser(req);

        if (!user) {
            return res.status(401).json({
                error: "Please sign in first."
            });
        }

        const token = await events.grant(["streetspot"]);

        return res.json(token);

    } catch (error) {
        console.error("Events token error:", error);

        return res.status(500).json({
            error: "Unable to connect to live updates."
        });
    }
}
