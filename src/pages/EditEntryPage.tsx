import React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { EntryForm } from './EntryForm'
import { ArrowLeft } from 'lucide-react'

export function EditEntryPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <Layout>
      <div className="flex items-start justify-between gap-4 md:items-center">
        <div>
          <div className="text-xl font-semibold tracking-tight">Edit entry</div>
          <div className="mt-1 text-sm text-white/55">Update fields and save changes.</div>
        </div>

        <Link to={id ? `/entries/${id}` : '/dashboard'}>
          <Button variant="ghost">
            <ArrowLeft size={18} /> Back
          </Button>
        </Link>
      </div>

      <EntryForm
        mode="edit"
        entryId={id}
        onSaved={(nextStatus) => {
          if (nextStatus === 'Ongoing') navigate('/ongoing')
          else if (nextStatus === 'Resolved') navigate('/resolved')
          else if (nextStatus === 'Social Media') navigate('/social-media')
          else navigate(id ? `/entries/${id}` : '/dashboard')
        }}
      />
    </Layout>
  )
}
