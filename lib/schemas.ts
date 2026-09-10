import { z } from 'zod';

export const CANONICAL_DIMENSION_KEYS = ['Problem clarity','User specificity','Novelty','Feasibility','Hackathon scope','Demoability','Sponsor fit','Adoption','Impact','Evidence'] as const;

export const analysisInputSchema = z.object({
  hackathonUrl: z.union([z.literal(''), z.string().url()]).optional(), idea: z.string().trim().min(12).max(3000),
  teamSize: z.number().int().min(1).max(20).optional(), hours: z.number().int().min(4).max(168).optional(),
  strengths: z.string().max(500).optional(), goal: z.string().max(100).optional(), simulateFailure: z.boolean().optional(),
});

const dimensionSchema = z.object({ key: z.enum(CANONICAL_DIMENSION_KEYS), score: z.number().min(0), max: z.number().positive(), note: z.string().trim().min(1) });
export const inferenceOutputSchema = z.object({
  score: z.number().min(0).max(100), confidence: z.number().min(0).max(100), summary: z.string(),
  dimensions: z.array(dimensionSchema).length(10), strengths: z.array(z.string()).min(1), weaknesses: z.array(z.string()).min(1),
  uncertainties: z.array(z.string()), pivot: z.string(), hardTruth: z.string(),
});

export const mentorInferenceJsonSchema = {
  name: 'pivot_mentor_assessment', strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    properties: {
      score: { type: 'number', minimum: 0, maximum: 100 }, confidence: { type: 'number', minimum: 0, maximum: 100 }, summary: { type: 'string' },
      dimensions: { type: 'array', minItems: 10, maxItems: 10, items: { type: 'object', additionalProperties: false, properties: {
        key: { type: 'string', enum: [...CANONICAL_DIMENSION_KEYS] }, score: { type: 'number', minimum: 0 }, max: { type: 'number', exclusiveMinimum: 0 }, note: { type: 'string', minLength: 1 },
      }, required: ['key','score','max','note'] } },
      strengths: { type: 'array', minItems: 1, items: { type: 'string' } }, weaknesses: { type: 'array', minItems: 1, items: { type: 'string' } },
      uncertainties: { type: 'array', items: { type: 'string' } }, pivot: { type: 'string' }, hardTruth: { type: 'string' },
    },
    required: ['score','confidence','summary','dimensions','strengths','weaknesses','uncertainties','pivot','hardTruth'],
  },
} as const;

type CanonicalDimension = typeof CANONICAL_DIMENSION_KEYS[number];
type UnknownRecord = Record<string, unknown>;
function record(value: unknown, context: string): UnknownRecord { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${context} must be an object`); return value as UnknownRecord; }
function labelToken(value: string) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,''); }

const aliases: Record<string, CanonicalDimension> = {
  problemdefinition:'Problem clarity', problemstatementclarity:'Problem clarity',
  targetuser:'User specificity', targetuserspecificity:'User specificity', audienceclarity:'User specificity',
  differentiation:'Novelty', noveltyanddifferentiation:'Novelty', originality:'Novelty',
  realworldfeasibility:'Feasibility', technicalfeasibility:'Feasibility', implementationfeasibility:'Feasibility',
  scope:'Hackathon scope', weekendscope:'Hackathon scope', mvpscope:'Hackathon scope',
  demoabilityandclarity:'Demoability', demopotential:'Demoability', demonstration:'Demoability',
  sponsortrackfit:'Sponsor fit', sponsorandtrackfit:'Sponsor fit', trackfit:'Sponsor fit',
  businessmodel:'Adoption', businessandadoptionmodel:'Adoption', businessadoption:'Adoption', adoptionmodel:'Adoption',
  impactandutility:'Impact', impactutility:'Impact', utility:'Impact', evidencequality:'Evidence', researchquality:'Evidence', evidencecoverage:'Evidence',
};
const canonicalByToken = new Map(CANONICAL_DIMENSION_KEYS.map(key => [labelToken(key), key]));

export function normalizeDimensionKey(value: unknown): CanonicalDimension {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Mentor dimension label is missing');
  const token=labelToken(value); const exact=canonicalByToken.get(token) ?? aliases[token]; if(exact)return exact;
  const prefixMatches=[...canonicalByToken.entries()].filter(([canonical])=>token.startsWith(canonical)&&/^(?:score)?(?:\d+)?(?:points?|pts?|max)?$/.test(token.slice(canonical.length)));
  if(prefixMatches.length===1)return prefixMatches[0][1];
  throw new Error(`Unknown mentor dimension label: "${value}". Expected one of: ${CANONICAL_DIMENSION_KEYS.join(', ')}`);
}

function explanatoryNote(dimension:UnknownRecord,score:unknown,max:unknown){for(const field of ['note','rationale','reason','explanation','feedback','assessment','justification']){const value=dimension[field];if(typeof value==='string'&&value.trim())return value.trim();}return `Scored ${String(score)} of ${String(max)}; the model supplied no additional explanation.`;}

export function normalizeInferenceOutput(value:unknown):unknown{
  const output=record(value,'Mentor response');if(!Array.isArray(output.dimensions))throw new Error('Mentor response dimensions must be an array');const seen=new Set<CanonicalDimension>();
  const normalized=output.dimensions.map((raw,index)=>{const dimension=record(raw,`dimensions[${index}]`);const key=normalizeDimensionKey(dimension.key??dimension.label??dimension.name??dimension.dimension);if(seen.has(key))throw new Error(`Duplicate mentor dimension after normalization: "${key}"`);seen.add(key);const score=dimension.score??dimension.value;const max=dimension.max??dimension.maximum??dimension.weight;return{...dimension,key,score,max,note:explanatoryNote(dimension,score,max)};});
  const missing=CANONICAL_DIMENSION_KEYS.filter(key=>!seen.has(key));if(missing.length)throw new Error(`Missing mentor dimensions after normalization: ${missing.join(', ')}`);const byKey=new Map(normalized.map(dimension=>[dimension.key,dimension]));return{...output,dimensions:CANONICAL_DIMENSION_KEYS.map(key=>byKey.get(key))};
}

export function extractModelJson(raw:string):unknown{const fenced=raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]??raw;const start=fenced.indexOf('{'),end=fenced.lastIndexOf('}');if(start<0||end<0)throw new Error('Model response did not contain JSON');return JSON.parse(fenced.slice(start,end+1));}
export function parseModelJson(raw:string){return inferenceOutputSchema.parse(normalizeInferenceOutput(extractModelJson(raw)));}
