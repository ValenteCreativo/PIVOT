import { z } from 'zod';

export const CANONICAL_DIMENSION_KEYS = ['Problem clarity','User specificity','Novelty','Feasibility','Hackathon scope','Demoability','Sponsor fit','Adoption','Impact','Evidence'] as const;

export const analysisInputSchema = z.object({hackathonUrl:z.union([z.literal(''),z.string().url()]).optional(),idea:z.string().trim().min(12).max(3000),teamSize:z.number().int().min(1).max(20).optional(),hours:z.number().int().min(4).max(168).optional(),strengths:z.string().max(500).optional(),goal:z.string().max(100).optional(),simulateFailure:z.boolean().optional()});

const dimensionSchema=z.object({key:z.enum(CANONICAL_DIMENSION_KEYS),score:z.number().min(0),max:z.number().positive(),note:z.string().trim().min(1)});
const sponsorFitSchema=z.object({name:z.string().min(1),fit:z.enum(['NATURAL','POSSIBLE','FORCED','UNKNOWN']),reason:z.string().min(1)});
export const inferenceOutputSchema=z.object({
  confidence:z.number().min(0).max(100),summary:z.string().min(1),dimensions:z.array(dimensionSchema).length(10),
  strengths:z.array(z.string()).min(1),weaknesses:z.array(z.string()).min(1),uncertainties:z.array(z.string()),
  novelty:z.object({direct:z.array(z.string()),adjacent:z.array(z.string()),wedge:z.string(),judgment:z.string()}),
  adoption:z.object({user:z.string(),payer:z.string(),why:z.string(),first100:z.string()}),
  feasibility:z.array(z.string()).min(1),sponsorFit:z.array(sponsorFitSchema).min(1),pivot:z.string().min(1),
  mvp:z.array(z.string()).min(1).max(5),doNotBuild:z.array(z.string()).min(1),stack:z.array(z.string()).min(1),
  plan:z.array(z.object({time:z.string(),milestone:z.string()})).min(1),demoPlan:z.array(z.object({time:z.string(),beat:z.string()})).min(1),
  hardTruth:z.string().min(1),nextValidation:z.array(z.string()).min(1),
});
export type MentorModelAssessment=z.infer<typeof inferenceOutputSchema>;

const stringArray={type:'array',items:{type:'string'}} as const;
export const mentorInferenceJsonSchema={name:'pivot_target_project_assessment',strict:true,schema:{type:'object',additionalProperties:false,properties:{
  confidence:{type:'number',minimum:0,maximum:100},summary:{type:'string'},
  dimensions:{type:'array',minItems:10,maxItems:10,items:{type:'object',additionalProperties:false,properties:{key:{type:'string',enum:[...CANONICAL_DIMENSION_KEYS]},score:{type:'number',minimum:0},max:{type:'number',exclusiveMinimum:0},note:{type:'string',minLength:1}},required:['key','score','max','note']}},
  strengths:{...stringArray,minItems:1},weaknesses:{...stringArray,minItems:1},uncertainties:stringArray,
  novelty:{type:'object',additionalProperties:false,properties:{direct:stringArray,adjacent:stringArray,wedge:{type:'string'},judgment:{type:'string'}},required:['direct','adjacent','wedge','judgment']},
  adoption:{type:'object',additionalProperties:false,properties:{user:{type:'string'},payer:{type:'string'},why:{type:'string'},first100:{type:'string'}},required:['user','payer','why','first100']},
  feasibility:{...stringArray,minItems:1},sponsorFit:{type:'array',minItems:1,items:{type:'object',additionalProperties:false,properties:{name:{type:'string'},fit:{type:'string',enum:['NATURAL','POSSIBLE','FORCED','UNKNOWN']},reason:{type:'string'}},required:['name','fit','reason']}},
  pivot:{type:'string'},mvp:{...stringArray,minItems:1,maxItems:5},doNotBuild:{...stringArray,minItems:1},stack:{...stringArray,minItems:1},
  plan:{type:'array',minItems:1,items:{type:'object',additionalProperties:false,properties:{time:{type:'string'},milestone:{type:'string'}},required:['time','milestone']}},
  demoPlan:{type:'array',minItems:1,items:{type:'object',additionalProperties:false,properties:{time:{type:'string'},beat:{type:'string'}},required:['time','beat']}},
  hardTruth:{type:'string'},nextValidation:{...stringArray,minItems:1},
},required:['confidence','summary','dimensions','strengths','weaknesses','uncertainties','novelty','adoption','feasibility','sponsorFit','pivot','mvp','doNotBuild','stack','plan','demoPlan','hardTruth','nextValidation']}} as const;

type CanonicalDimension=typeof CANONICAL_DIMENSION_KEYS[number];type UnknownRecord=Record<string,unknown>;
function record(value:unknown,context:string):UnknownRecord{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${context} must be an object`);return value as UnknownRecord;}
function labelToken(value:string){return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,'');}
const aliases:Record<string,CanonicalDimension>={problemdefinition:'Problem clarity',problemstatementclarity:'Problem clarity',targetuser:'User specificity',targetuserspecificity:'User specificity',audienceclarity:'User specificity',differentiation:'Novelty',noveltyanddifferentiation:'Novelty',originality:'Novelty',realworldfeasibility:'Feasibility',technicalfeasibility:'Feasibility',implementationfeasibility:'Feasibility',scope:'Hackathon scope',weekendscope:'Hackathon scope',mvpscope:'Hackathon scope',demoabilityandclarity:'Demoability',demopotential:'Demoability',demonstration:'Demoability',sponsortrackfit:'Sponsor fit',sponsorandtrackfit:'Sponsor fit',trackfit:'Sponsor fit',businessmodel:'Adoption',businessandadoptionmodel:'Adoption',businessadoption:'Adoption',adoptionmodel:'Adoption',impactandutility:'Impact',impactutility:'Impact',utility:'Impact',evidencequality:'Evidence',researchquality:'Evidence',evidencecoverage:'Evidence'};
const canonicalByToken=new Map(CANONICAL_DIMENSION_KEYS.map(key=>[labelToken(key),key]));
export function normalizeDimensionKey(value:unknown):CanonicalDimension{if(typeof value!=='string'||!value.trim())throw new Error('Mentor dimension label is missing');const token=labelToken(value),exact=canonicalByToken.get(token)??aliases[token];if(exact)return exact;const matches=[...canonicalByToken.entries()].filter(([canonical])=>token.startsWith(canonical)&&/^(?:score)?(?:\d+)?(?:points?|pts?|max)?$/.test(token.slice(canonical.length)));if(matches.length===1)return matches[0][1];throw new Error(`Unknown mentor dimension label: "${value}". Expected one of: ${CANONICAL_DIMENSION_KEYS.join(', ')}`);}
function explanatoryNote(dimension:UnknownRecord,score:unknown,max:unknown){for(const field of ['note','rationale','reason','explanation','feedback','assessment','justification']){const value=dimension[field];if(typeof value==='string'&&value.trim())return value.trim();}return `Scored ${String(score)} of ${String(max)}; the model supplied no additional explanation.`;}
export function normalizeInferenceOutput(value:unknown):unknown{const output=record(value,'Mentor response');if(!Array.isArray(output.dimensions))throw new Error('Mentor response dimensions must be an array');const seen=new Set<CanonicalDimension>();const normalized=output.dimensions.map((raw,index)=>{const dimension=record(raw,`dimensions[${index}]`),key=normalizeDimensionKey(dimension.key??dimension.label??dimension.name??dimension.dimension);if(seen.has(key))throw new Error(`Duplicate mentor dimension after normalization: "${key}"`);seen.add(key);const score=dimension.score??dimension.value,max=dimension.max??dimension.maximum??dimension.weight;return{...dimension,key,score,max,note:explanatoryNote(dimension,score,max)};});const missing=CANONICAL_DIMENSION_KEYS.filter(key=>!seen.has(key));if(missing.length)throw new Error(`Missing mentor dimensions after normalization: ${missing.join(', ')}`);const byKey=new Map(normalized.map(d=>[d.key,d]));return{...output,dimensions:CANONICAL_DIMENSION_KEYS.map(key=>byKey.get(key))};}
export function extractModelJson(raw:string):unknown{const fenced=raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]??raw;const start=fenced.indexOf('{'),end=fenced.lastIndexOf('}');if(start<0||end<0)throw new Error('Model response did not contain JSON');return JSON.parse(fenced.slice(start,end+1));}
export function parseModelJson(raw:string){return inferenceOutputSchema.parse(normalizeInferenceOutput(extractModelJson(raw)));}
