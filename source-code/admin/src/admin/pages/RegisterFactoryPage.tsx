import { useState, type ComponentProps, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAdminStore } from '../data/AdminStore'
import { DISTRICTS, type FactoryProfile } from '../data/types'

const ELEVATIONS: FactoryProfile['elevation'][] = ['Low grown', 'Mid grown', 'High grown']
const DISTRICT_OPTIONS = DISTRICTS.map((d) => ({ value: d, label: d }))
const ELEVATION_OPTIONS = ELEVATIONS.map((e) => ({ value: e, label: e }))

const EMPTY = {
  name: '',
  businessRegNo: '',
  teaBoardRegNo: '',
  district: '',
  address: '',
  phone: '',
  email: '',
  elevation: '',
  estimatedSuppliers: '',
  adminName: '',
  adminDesignation: '',
  adminNic: '',
  adminEmail: '',
  adminPhone: '',
}
type FormState = typeof EMPTY
type Field = keyof FormState

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^0\d{9}$/
const NIC = /^(\d{9}[vVxX]|\d{12})$/

function validate(v: FormState) {
  const e: Partial<Record<Field, string>> = {}
  const required: Field[] = [
    'name',
    'businessRegNo',
    'teaBoardRegNo',
    'district',
    'address',
    'phone',
    'elevation',
    'adminName',
    'adminNic',
    'adminEmail',
    'adminPhone',
  ]
  for (const f of required) if (!v[f].trim()) e[f] = 'Required'
  if (v.email && !EMAIL.test(v.email)) e.email = 'Enter a valid email'
  if (v.adminEmail && !EMAIL.test(v.adminEmail)) e.adminEmail = 'Enter a valid email'
  if (v.phone && !PHONE.test(v.phone.replace(/\s/g, ''))) e.phone = '10 digits, starting with 0'
  if (v.adminPhone && !PHONE.test(v.adminPhone.replace(/\s/g, ''))) e.adminPhone = '10 digits, starting with 0'
  if (v.adminNic && !NIC.test(v.adminNic.trim())) e.adminNic = 'Old (9 digits + V) or new (12 digits) NIC'
  if (v.estimatedSuppliers && !(Number(v.estimatedSuppliers) >= 0)) e.estimatedSuppliers = 'Enter a number'
  return e
}

export default function RegisterFactoryPage() {
  const navigate = useNavigate()
  const { registerFactory } = useAdminStore()
  const [values, setValues] = useState<FormState>(EMPTY)
  const [submitted, setSubmitted] = useState(false)
  const errors = submitted ? validate(values) : {}

  const set = (field: Field) => (value: string) => setValues((v) => ({ ...v, [field]: value }))
  const input = (field: Field, label: string, props: Partial<ComponentProps<typeof Input>> = {}) => (
    <Input
      id={field}
      label={label}
      value={values[field]}
      onChange={(e) => set(field)(e.target.value)}
      error={errors[field]}
      {...props}
    />
  )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(validate(values)).length) return
    const factory = registerFactory(
      {
        name: values.name.trim(),
        businessRegNo: values.businessRegNo.trim(),
        teaBoardRegNo: values.teaBoardRegNo.trim(),
        district: values.district,
        address: values.address.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        elevation: values.elevation as FactoryProfile['elevation'],
        estimatedSuppliers: Number(values.estimatedSuppliers) || 0,
      },
      {
        fullName: values.adminName.trim(),
        designation: values.adminDesignation.trim(),
        nic: values.adminNic.trim(),
        email: values.adminEmail.trim(),
        phone: values.adminPhone.trim(),
      },
    )
    navigate(`/factories/${factory.id}?new=1`)
  }

  const errorCount = Object.keys(errors).length

  return (
    <>
      <Link to="/factories" className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Factories
      </Link>
      <PageHeader
        title="Register a factory"
        description="Onboard a factory directly, for example after a site visit. It skips the request queue and goes live immediately."
      />

      <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Factory details</CardTitle>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{input('name', 'Factory name', { placeholder: 'e.g. Kalawana Tea Producers' })}</div>
            {input('businessRegNo', 'Business registration no.', { placeholder: 'PV 00000000' })}
            {input('teaBoardRegNo', 'Tea Board registration no.', { placeholder: 'TB/LG/0000' })}
            <Select
              id="district"
              label="District"
              value={values.district}
              onChange={(e) => set('district')(e.target.value)}
              options={DISTRICT_OPTIONS}
              placeholder="Select district"
              error={errors.district}
            />
            <Select
              id="elevation"
              label="Elevation"
              value={values.elevation}
              onChange={(e) => set('elevation')(e.target.value)}
              options={ELEVATION_OPTIONS}
              placeholder="Select elevation"
              error={errors.elevation}
            />
            <div className="sm:col-span-2">{input('address', 'Address')}</div>
            {input('phone', 'Factory phone', { inputMode: 'tel', placeholder: '045 222 0000' })}
            {input('email', 'Factory email', { type: 'email', hint: 'Optional' })}
            {input('estimatedSuppliers', 'Estimated suppliers', {
              inputMode: 'numeric',
              hint: 'Optional — roughly how many estate owners supply leaf',
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-base">Factory Administrator</CardTitle>
              <p className="text-[13px] text-text-muted">They receive an email invitation to set their password.</p>
            </div>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {input('adminName', 'Full name')}
            {input('adminDesignation', 'Designation', { placeholder: 'e.g. Factory Manager', hint: 'Optional' })}
            {input('adminNic', 'NIC', { placeholder: '199012345678' })}
            {input('adminPhone', 'Mobile', { inputMode: 'tel', placeholder: '077 000 0000' })}
            <div className="sm:col-span-2">{input('adminEmail', 'Email', { type: 'email' })}</div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {errorCount > 0 && (
            <p role="alert" className="mr-auto text-sm text-danger-fg">
              Fix {errorCount} {errorCount === 1 ? 'field' : 'fields'} to continue.
            </p>
          )}
          <Button type="button" variant="secondary" onClick={() => navigate('/factories')}>
            Cancel
          </Button>
          <Button type="submit">Register factory</Button>
        </div>
      </form>
    </>
  )
}
