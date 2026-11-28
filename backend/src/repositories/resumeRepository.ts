import { EMPTY_RESUME_CONTENT, type Resume, type ResumeContent } from '@jobdash/shared';
import { VersionConflictError } from '../errors';
import { readData, updateData } from '../store/dataStore';

/** The single resume document. */
export const resumeRepository = {
  /** The stored resume, or an empty one with version 0 when nothing has been saved yet. */
  async get(): Promise<Resume> {
    const { resume } = await readData();
    return resume ? structuredClone(resume) : { ...EMPTY_RESUME_CONTENT, version: 0, updatedAt: '' };
  },

  /** Replace the whole document. `version` is the version the client edited (0 = first save). */
  put(content: ResumeContent, version: number): Promise<Resume> {
    return updateData((draft) => {
      if ((draft.resume?.version ?? 0) !== version) throw new VersionConflictError();
      const resume: Resume = { ...content, version: version + 1, updatedAt: new Date().toISOString() };
      draft.resume = resume;
      return structuredClone(resume);
    });
  },
};
