import Header from '@/components/layout/Header';

export default function HomePage() {
  return (
    <div className='min-h-screen'>
      <Header />

      <main className='max-w-5xl mx-auto px-6 py-10'>
        <div className='mb-10 animate-fade-in'>
          <h2 className='text-2xl font-bold text-text-primary font-heading'>Varogo</h2>
          <p className='mt-2 text-base text-text-muted'>
            AI 기반 마케팅 전략을 시작하세요.
          </p>
        </div>
      </main>
    </div>
  );
}
