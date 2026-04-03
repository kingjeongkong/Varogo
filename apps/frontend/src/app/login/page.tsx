import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <main className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
      <div className='w-full max-w-sm'>
        <div className='mb-8 text-center'>
          <h1 className='text-2xl font-bold text-gray-900'>
            <span className='text-indigo-600'>Varogo</span>
          </h1>
          <p className='mt-2 text-sm text-gray-500'>로그인하여 마케팅 전략을 시작하세요</p>
        </div>
        <div className='bg-white border border-gray-200 rounded-xl p-8'>
          <LoginForm />
          <p className='mt-6 text-center text-sm text-gray-500'>
            계정이 없으신가요?{' '}
            <Link href='/signup' className='text-indigo-600 hover:text-indigo-700 font-medium'>
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
