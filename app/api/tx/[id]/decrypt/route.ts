import { NextResponse } from 'next/server';
import { txService } from '@/lib/tx-service';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const payload = await txService.decryptRecord(params.id);
        return NextResponse.json({ payload });
    } catch (error: any) {
        if (error.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
        if (error.message.includes('tampered') || error.message.includes('Integrity')) {
            return NextResponse.json({ error: 'Security Breach: Data integrity check failed' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
