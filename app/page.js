import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">欢迎</h1>
      <p className="text-gray-600 mb-8 text-lg">请登录或注册以继续</p>
      <div className="flex gap-4">
        <Link href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          登录
        </Link>
        <Link href="/register" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">
          注册
        </Link>
      </div>
    </div>
  );
}
