import { tool } from "ai";
import { z } from "zod";

const timeTool =  tool({
    name: "time",
    description: "Get the current time",
    inputSchema: z.object({
        region: z.string().describe("The time zone to get the current time for").optional().default("UTC"),
    }),
    execute: async ({ region }: { region: string }) => {
        try {
            return new Date().toLocaleTimeString(undefined, { timeZone: region, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
        } catch (error) {
            console.error(`Error getting the current time: ${error}`);
            return `Error getting the current time: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
});

export default timeTool;