import CustomerForm from '@/components/CustomerForm'

export default function NewCustomerPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">新規顧客登録</h1>
      <CustomerForm />
    </div>
  )
}
