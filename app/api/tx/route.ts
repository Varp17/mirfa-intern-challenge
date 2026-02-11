import { NextResponse } from 'next/server';
import { txService } from '@/lib/tx-service';

export async function GET() {
    try {
        const records = txService.getAllRecords();
        return NextResponse.json(records);
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
