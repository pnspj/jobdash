import type { Agent, AgentInputParsed, Company, CompanyInputParsed, Todo, TodoInputParsed } from '@jobdash/shared';
import { createEntityRepository } from './entityRepository';

export const companyRepository = createEntityRepository<Company, CompanyInputParsed>('companies', 'Company');
export const agentRepository = createEntityRepository<Agent, AgentInputParsed>('agents', 'Agent');
export const todoRepository = createEntityRepository<Todo, TodoInputParsed>('todos', 'To-do');
