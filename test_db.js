import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://cgonfndnnahuguqtnaxo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnb25mbmRubmFodWd1cXRuYXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Mzg5MDgsImV4cCI6MjA4ODQxNDkwOH0.tKT8n-lu8I6l_02I2Ldc4N3jgFBvHa1xP1buOsCLBoY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
    console.log("Testing insert with 'TURMA'...");
    const { data, error } = await supabase.from('history').insert([{
        id: 'test-' + Date.now(),
        aluno_id: 'TURMA',
        aluno_nome: '[Avaliação de Turma]',
        turma: 'TESTE',
        categoria: 'avaliacao_aula',
        detalhe: JSON.stringify({ stars: 5, comment: 'teste' }),
        raw_timestamp: Date.now(),
        professor: 'TEST_USER',
        autor_role: 'admin'
    }]);

    if (error) {
        console.error("Error inserting 'TURMA':", error.message, error.details);
    } else {
        console.log("Success inserting 'TURMA'!");
    }

    console.log("\nTesting insert with valid UUID (if possible)...");
    // Let's try to find a valid student first
    const { data: students } = await supabase.from('alumnos').select('id').limit(1);
    if (students && students.length > 0) {
        const studentId = students[0].id;
        const { error: error2 } = await supabase.from('history').insert([{
            id: 'test2-' + Date.now(),
            aluno_id: studentId,
            aluno_nome: 'Teste Aluno',
            turma: 'TESTE',
            categoria: 'atraso',
            detalhe: 'teste',
            raw_timestamp: Date.now(),
            professor: 'TEST_USER',
            autor_role: 'admin'
        }]);
        if (error2) {
            console.error("Error inserting with valid ID:", error2.message);
        } else {
            console.log("Success inserting with valid ID!");
        }
    }
}

testInsert();
