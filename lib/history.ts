import * as diff from 'diff';
import { randomUUID } from 'crypto';

export interface CommitState {
  id: string;
  type: 'snapshot' | 'patch';
  data?: string;   // if snapshot
  patch?: string;  // if patch
  device: string | null;
  user?: string | null;
  committedAt: string | null;
}

export interface BlobState {
  workingCopy: string;
  workingCopyId: string;
  commits: CommitState[];
}

export function buildHistory(blob: BlobState) {
  const reconstructed = [];
  
  // Index 0: working copy (uncommitted changes)
  reconstructed.push({
    id: blob.workingCopyId,
    data: blob.workingCopy,
    device: null,
    user: null,
    committedAt: null
  });

  if (!blob.commits || blob.commits.length === 0) return reconstructed;

  let currentText = blob.commits[0].data || ""; 

  reconstructed.push({
    id: blob.commits[0].id,
    data: currentText,
    device: blob.commits[0].device,
    user: blob.commits[0].user,
    committedAt: blob.commits[0].committedAt
  });

  for (let i = 1; i < blob.commits.length; i++) {
    const c = blob.commits[i];
    if (c.type === 'snapshot') {
      currentText = c.data || "";
    } else {
      // apply reverse patch to go one step back in time
      const patched = diff.applyPatch(currentText, c.patch || "");
      if (typeof patched === "string") {
        currentText = patched;
      }
    }
    
    reconstructed.push({
      id: c.id,
      data: currentText,
      device: c.device,
      user: c.user,
      committedAt: c.committedAt
    });
  }

  return reconstructed;
}

export function commitChanges(blob: BlobState, newText: string, metadata: { device: string | null, user?: string | null }): BlobState {
  // The ID of the commit becomes the ID of the working copy that was just committed
  const commitId = blob.workingCopyId;
  
  if (!blob.commits || blob.commits.length === 0) {
    blob.commits = [{
      id: commitId,
      type: 'snapshot',
      data: newText,
      ...metadata,
      committedAt: new Date().toISOString()
    }];
    blob.workingCopy = newText;
    blob.workingCopyId = randomUUID();
    return blob;
  }

  const latestCommitText = blob.commits[0].data || "";
  
  // Reverse delta: Patch goes from NEW text back to OLD text
  const patchStr = diff.createPatch("env", newText, latestCommitText);
  
  // Turn the old snapshot into a patch
  blob.commits[0] = {
    ...blob.commits[0],
    type: 'patch',
    patch: patchStr,
    data: undefined
  };
  
  // Insert the new snapshot at the front
  blob.commits.unshift({
    id: commitId,
    type: 'snapshot',
    data: newText,
    ...metadata,
    committedAt: new Date().toISOString()
  });
  
  blob.workingCopy = newText;
  blob.workingCopyId = randomUUID(); // Generate a new ID for the new working copy
  
  // Max 50 commits limit
  if (blob.commits.length > 50) {
    blob.commits = blob.commits.slice(0, 50);
  }

  return blob;
}

export function updateWorkingCopy(blob: BlobState, newText: string): BlobState {
  blob.workingCopy = newText;
  return blob;
}

export function createInitialBlob(initialText: string): BlobState {
  return {
    workingCopy: initialText,
    workingCopyId: randomUUID(),
    commits: []
  };
}
