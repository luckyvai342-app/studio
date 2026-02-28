'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating AI-powered match recaps for Free Fire tournaments.
 *
 * - generateMatchRecap - A function that generates a textual recap of a Free Fire match.
 * - MatchRecapInput - The input type for the generateMatchRecap function.
 * - MatchRecapOutput - The return type for the generateMatchRecap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const MatchRecapPlayerSchema = z.object({
  username: z.string().describe("The player's in-game username."),
  kills: z.number().int().nonnegative().describe('The number of kills achieved by the player.'),
  damageDealt: z.number().nonnegative().describe('The total damage dealt by the player.'),
  placement: z.number().int().min(1).describe('The final placement of the player in the match (e.g., 1st, 5th).'),
});

const MatchRecapInputSchema = z.object({
  tournamentName: z.string().describe('The name of the Free Fire tournament.'),
  matchDate: z.string().describe('The date the match took place (e.g., "YYYY-MM-DD").'),
  players: z.array(MatchRecapPlayerSchema).min(1).describe('A list of all participating players and their match statistics.'),
  significantMoments: z.array(z.string()).optional().describe('Optional descriptions of key moments or events during the match.'),
});
export type MatchRecapInput = z.infer<typeof MatchRecapInputSchema>;

// Output Schema
const MatchRecapOutputSchema = z.object({
  recapText: z.string().describe('The AI-generated textual recap of the Free Fire match.'),
});
export type MatchRecapOutput = z.infer<typeof MatchRecapOutputSchema>;

// Prompt definition
const matchRecapPrompt = ai.definePrompt({
  name: 'freeFireMatchRecapPrompt',
  input: { schema: MatchRecapInputSchema },
  output: { schema: MatchRecapOutputSchema },
  prompt: `You are an experienced and enthusiastic esports commentator and analyst for Free Fire Apex tournaments. Your task is to generate an engaging, detailed, and exciting textual recap of a recently concluded match.

The recap should highlight:
1.  **Overall match summary**: A brief overview of the match's intensity and outcome.
2.  **Top performers**: Identify players with the most kills, highest damage, and top placements (especially those in the top 20).
3.  **Key statistics**: Mention interesting stats like total kills by top players, total damage, etc.
4.  **Significant moments**: If provided, weave these into the narrative to make the recap more vivid.
5.  **Tone**: Maintain an energetic, celebratory, and analytical tone appropriate for esports commentary.

---
Tournament Name: {{{tournamentName}}}
Match Date: {{{matchDate}}}

Players and their stats:
{{#each players}}
- {{username}}: Kills={{kills}}, Damage={{damageDealt}}, Placement={{placement}}
{{/each}}

{{#if significantMoments}}
Significant Moments:
{{#each significantMoments}}
- {{{this}}}
{{/each}}
{{/if}}
---

Generate the match recap now:`
});

// Flow definition
const aiPoweredMatchRecapGenerationFlow = ai.defineFlow(
  {
    name: 'aiPoweredMatchRecapGenerationFlow',
    inputSchema: MatchRecapInputSchema,
    outputSchema: MatchRecapOutputSchema,
  },
  async (input) => {
    const {output} = await matchRecapPrompt(input);
    if (!output) {
      throw new Error("Failed to generate match recap.");
    }
    return output;
  }
);

// Wrapper function
export async function generateMatchRecap(input: MatchRecapInput): Promise<MatchRecapOutput> {
  return aiPoweredMatchRecapGenerationFlow(input);
}
