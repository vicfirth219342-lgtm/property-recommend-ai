import { createServiceClient } from '@/lib/supabase'
import CustomerForm from '@/components/CustomerForm'
import { notFound } from 'next/navigation'
import { CustomerWithCondition } from '@/types'

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('customers')
    .select('*, customer_conditions(*), customer_search_urls(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!data) notFound()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{data.name} — 編集</h1>
      <CustomerForm initial={data as unknown as CustomerWithCondition} customerId={id} />
    </div>
  )
}
