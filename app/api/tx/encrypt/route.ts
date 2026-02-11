import { NextResponse } from 'next/server';
import { txService } from '@/lib/tx-service';
import { z } from 'zod';

const EncryptSchema = z.object({
    partyId: z.string().min(1),
    payload: z.any(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { partyId, payload } = EncryptSchema.parse(body);
        const record = await txService.encryptAndStore(partyId, payload);
        return NextResponse.json(record);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
