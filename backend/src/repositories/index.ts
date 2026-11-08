import type { Agent, AgentInputParsed, Company, CompanyInputParsed, Todo, TodoInputParsed } from '@jobdash/shared';
import { createEntityRepository } from './entityRepository';

export const companyRepository = createEntityRepository<Company, CompanyInputParsed>('COMPANY', 'Company');
export const agentRepository = createEntityRepository<Agent, AgentInputParsed>('AGENT', 'Agent');
export const todoRepository = createEntityRepository<Todo, TodoInputParsed>('TODO', 'To-do');
