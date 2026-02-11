// @ts-nocheck
import './globals.css'

// Declarations to satisfy IDE when @types/react is missing
declare namespace React {
    type ReactNode = any;
}
declare const JSX: any;

export const metadata = {
    title: 'SecureTx | Envelope Encryption',
    description: 'Production-ready secure transaction mini app',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
