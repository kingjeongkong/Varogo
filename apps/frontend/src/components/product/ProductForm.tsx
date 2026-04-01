'use client'

import { createProduct } from '@/lib/api'
import type { CreateProductInput } from '@/lib/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ProductForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    url: '',
    description: ''
  })
  const [errors, setErrors] = useState<Partial<CreateProductInput>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  function validate(): boolean {
    const newErrors: Partial<CreateProductInput> = {}
    if (!formData.name.trim()) {
      newErrors.name = '제품명을 입력해주세요.'
    }
    if (!formData.description.trim()) {
      newErrors.description = '제품 설명을 입력해주세요.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError(null)

    if (!validate()) return

    setIsLoading(true)
    try {
      const payload: CreateProductInput = {
        name: formData.name.trim(),
        description: formData.description.trim()
      }
      if (formData.url?.trim()) {
        payload.url = formData.url.trim()
      }

      const product = await createProduct(payload)
      router.push(`/products/${product.id}`)
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : '오류가 발생했습니다. 다시 시도해주세요.'
      )
      setIsLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof CreateProductInput]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          제품명 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="예: Varogo"
          className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.name ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
          제품 URL <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <input
          id="url"
          name="url"
          type="url"
          value={formData.url}
          onChange={handleChange}
          placeholder="https://example.com"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          제품 설명 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          value={formData.description}
          onChange={handleChange}
          placeholder="제품의 기능, 타겟 사용자, 해결하는 문제를 설명해주세요."
          className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
            errors.description ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Link
          href="/"
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading && (
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {isLoading ? '등록 중...' : '제품 등록'}
        </button>
      </div>
    </form>
  )
}
