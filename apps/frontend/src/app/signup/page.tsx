import Link from 'next/link';
import { SignupForm } from '@/features/auth/components/SignupForm';

export default function SignupPage() {
  return (
    <main className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
      <div className='w-full max-w-sm'>
        <div className='mb-8 text-center'>
          <h1 className='text-2xl font-bold text-gray-900'>
            <span className='text-indigo-600'>Varogo</span>
          </h1>
          <p className='mt-2 text-sm text-gray-500'>계정을 만들어 마케팅 전략을 시작하세요</p>
        </div>
        <div className='bg-white border border-gray-200 rounded-xl p-8'>
          <SignupForm />
          <p className='mt-6 text-center text-sm text-gray-500'>
            이미 계정이 있으신가요?{' '}
            <Link href='/login' className='text-indigo-600 hover:text-indigo-700 font-medium'>
              로그인
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
