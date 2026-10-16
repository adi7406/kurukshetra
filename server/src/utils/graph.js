import { ValidationError } from './errors.js';

/**
 * Validates that adding new prerequisite edges to a concept graph does not introduce self-links or cycles.
 *
 * An edge (conceptId, prerequisiteId) means: conceptId depends on prerequisiteId.
 *
 * @param {Array<{ concept_id: string, prerequisite_concept_id: string }>} existingEdges
 * @param {string} conceptId Target concept
 * @param {string[]} prerequisiteIds Prerequisite concepts that target concept depends on
 */
export function validatePrerequisitesAcyclic(existingEdges, conceptId, prerequisiteIds) {
  // 1. Check for self-links
  for (const prereqId of prerequisiteIds) {
    if (prereqId === conceptId) {
      throw new ValidationError(`Self-referencing prerequisite is not allowed: '${conceptId}' cannot depend on itself.`);
    }
  }

  // 2. Build adjacency list of dependencies: node -> set of nodes it depends on
  const adj = new Map();

  function addEdge(u, v) {
    if (!adj.has(u)) adj.set(u, new Set());
    adj.get(u).add(v);
  }

  // Add existing edges (excluding previous prerequisites for the target concept)
  for (const edge of existingEdges) {
    if (edge.concept_id !== conceptId) {
      addEdge(edge.concept_id, edge.prerequisite_concept_id);
    }
  }

  // Add proposed new edges
  for (const prereqId of prerequisiteIds) {
    addEdge(conceptId, prereqId);
  }

  // 3. Cycle detection using Depth-First Search (DFS) with node coloring
  // 0 = unvisited, 1 = visiting (in current recursion stack), 2 = visited
  const visited = new Map();

  function hasCycle(node) {
    visited.set(node, 1); // Mark as visiting

    const neighbors = adj.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        const state = visited.get(neighbor) || 0;
        if (state === 1) {
          // Cycle detected!
          return true;
        }
        if (state === 0 && hasCycle(neighbor)) {
          return true;
        }
      }
    }

    visited.set(node, 2); // Mark as completely visited
    return false;
  }

  // Check from all nodes in graph
  for (const node of adj.keys()) {
    if ((visited.get(node) || 0) === 0) {
      if (hasCycle(node)) {
        throw new ValidationError(
          `Cycle detected: setting prerequisite dependencies for '${conceptId}' creates a circular relationship.`
        );
      }
    }
  }

  return true;
}
