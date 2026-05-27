import './globals.css';

export const metadata = {
  title: 'My Site',
  description: 'A web application',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
