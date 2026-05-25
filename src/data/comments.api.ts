import * as store from './mockStore'

export async function createCommentApi(payload: {
  id?: string
  entryId: string
  commentText: string
  agentName: string
}) {
  return store.addCommentToEntry(payload.entryId, payload)
}

export async function updateCommentApi(id: string, payload: { commentText: string }) {
  return store.updateCommentOnEntry(id, payload.commentText)
}

export async function deleteCommentApi(id: string) {
  store.deleteCommentFromEntry(id)
}
