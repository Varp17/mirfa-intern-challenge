import { NextResponse } from 'next/server';
import { txService } from '@/lib/tx-service';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const record = txService.getRecord(params.id);
        return NextResponse.json(record);
    } catch (error: any) {
        if (error.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
