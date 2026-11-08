import type { Agent, AgentInputParsed, Company, CompanyInputParsed } from '@jobdash/shared';
import { createEntityRepository } from './entityRepository';

export const companyRepository = createEntityRepository<Company, CompanyInputParsed>('COMPANY', 'Company');
export const agentRepository = createEntityRepository<Agent, AgentInputParsed>('AGENT', 'Agent');
