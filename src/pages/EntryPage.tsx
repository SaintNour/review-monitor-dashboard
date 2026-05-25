import React from 'react'
import { Layout } from '../components/Layout'
import { EntryForm } from './EntryForm'

export function EntryPage() {
  return (
    <Layout>
      <div>
        <div className="text-2xl font-semibold tracking-tight text-white">New Entry</div>
        <div className="mt-1.5 text-sm text-white/52">Log a review from any platform.</div>
      </div>

      <EntryForm mode="create" />
    </Layout>
  )
}
