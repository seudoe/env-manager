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
  const isPristine = blob.workingCopy === "";
  const wcText = isPristine && blob.commits?.length > 0 ? (blob.commits[0].data || "") : blob.workingCopy;

  reconstructed.push({
    id: blob.workingCopyId,
    data: wcText,
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
  // Use context: 0 to eliminate unchanged context lines, making patches tiny
  const fullPatch = diff.createPatch("env", newText, latestCommitText, "", "", { context: 0 });
  
  // Strip the 4 lines of unified diff header (Index: env\n===\n---\n+++) to save even more space
  const patchStr = fullPatch.split('\n').slice(4).join('\n');
  
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
  
  blob.workingCopy = ""; // Set to empty to avoid duplicating the snapshot
  blob.workingCopyId = randomUUID(); // Generate a new ID for the new working copy
  
  // Max 50 commits limit
  if (blob.commits.length > 50) {
    blob.commits = blob.commits.slice(0, 50);
  }

  return blob;
}

export function updateWorkingCopy(blob: BlobState, newText: string): BlobState {
  if (blob.commits && blob.commits.length > 0 && blob.commits[0].data === newText) {
    blob.workingCopy = ""; // Save space
  } else {
    blob.workingCopy = newText;
  }
  return blob;
}

export function deleteCommit(blob: BlobState, commitId: string): BlobState {
  const idx = blob.commits.findIndex(c => c.id === commitId);
  if (idx === -1) throw new Error("Commit not found");

  const history = buildHistory(blob);
  
  // Realize working copy just in case it was relying on C[0] being deleted
  const wcText = history[0].data;
  blob.workingCopy = wcText;

  if (idx === blob.commits.length - 1) {
    // Oldest commit: just pop it
    blob.commits.pop();
  } else if (idx === 0) {
    // Newest commit (snapshot): C[1] becomes the new snapshot
    const c1 = blob.commits[1];
    const t1 = history[2].data;
    c1.type = 'snapshot';
    c1.data = t1;
    delete c1.patch;
    blob.commits.splice(0, 1);
  } else {
    // Intermediate commit: C[idx] is removed. C[idx+1] patch needs to go from T(idx-1) to T(idx+1)
    const t_prev = history[idx].data;   // T(idx-1)
    const t_next = history[idx+2].data; // T(idx+1)
    
    const fullPatch = diff.createPatch("env", t_prev, t_next, "", "", { context: 0 });
    const patchStr = fullPatch.split('\n').slice(4).join('\n');
    
    blob.commits[idx+1].patch = patchStr;
    blob.commits.splice(idx, 1);
  }
  
  // Re-deduplicate working copy if it matches the new snapshot
  if (blob.commits.length > 0 && blob.commits[0].data === blob.workingCopy) {
    blob.workingCopy = "";
  }
  
  return blob;
}

export function createInitialBlob(initialText: string): BlobState {
  return {
    workingCopy: initialText,
    workingCopyId: randomUUID(),
    commits: []
  };
}
