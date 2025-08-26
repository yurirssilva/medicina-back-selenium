const express = require('express')
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid'); // v4 é a versão mais usada
const wppconnect = require('@wppconnect-team/wppconnect');

const app = express()
app.use(cors())
// app.use(cors({
//     origin: 'http://localhost:4200', // frontend do Ionic
//     methods: ['GET', 'POST', 'PUT', 'DELETE']
//   }));
app.use(express.json());


function formatarData(date) {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0'); // mês começa em 0
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

wppconnect
  .create({
    phoneNumber: '5577991008357',
    catchLinkCode: (str) => console.log('Code:: ' + str),
    browserArgs: ['--no-sandbox']
  })
  .then((cl) => {
    client = cl;
    app.post('/send/:id', async (req, res) => {
      const { id } = req.params;
      const resultado = await pool.query('SELECT * FROM pacientes WHERE uuid = $1', [id]);
      if (resultado.rowCount === 0) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
      }
      const paciente = resultado.rows[0]
      console.log(paciente)

      const dataPreventivo = new Date(paciente.preventivo); // Ex: 2025-07-23
      const dataPreventivoAnual = new Date(dataPreventivo);
      dataPreventivoAnual.setFullYear(dataPreventivoAnual.getFullYear() + 1);
      const dataPreventivosSemestral = new Date(dataPreventivo);
      dataPreventivosSemestral.setMonth(dataPreventivosSemestral.getMonth() + 6);

      const message = `Olá ${paciente.nome}. Essa é uma mensagem da USF Vila América. Seu último preventivo foi realizado no dia ${ formatarData(dataPreventivo)} e o resultado foi ${paciente.risco ? 'alterado': 'normal'}, seu retorno está previsto para ${paciente.risco ? formatarData(dataPreventivosSemestral) : formatarData(dataPreventivoAnual)}`
      try {
        console.log('sendText')
        const result = await client.sendText(`55${paciente.telefone}@c.us`, message);
        return res.json({ status: "success", result });
      } catch (error) {
        return res.status(500).json({ status: "error", error: error.message });
      }

    })
  }).catch((error) => console.log(error));

// wppconnect
//   .create({
//     session: 'whatsapp-session',
//     catchQR: (qrCode, asciiQR, attempt, urlCode) => {
//       console.log("Escaneie o QR Code no seu WhatsApp:");
//       console.log(asciiQR);
//     },
//   })
//   .then((cl) => {
//     client = cl;

//     // Endpoint para enviar mensagem
//     app.post("/send", async (req, res) => {
//       const { phone, message } = req.body;

//       if (!phone || !message) {
//         return res.status(400).json({ error: "phone and message are required" });
//       }

//       try {
//         const result = await client.sendText(`${phone}@c.us`, message);
//         return res.json({ status: "success", result });
//       } catch (error) {
//         return res.status(500).json({ status: "error", error: error.message });
//       }
//     });

//     // Rota simples
//     app.get("/", (req, res) => {
//       res.send("WhatsApp API is running!");
//     });

//     // Inicia servidor
//     const PORT = process.env.PORT || 3000;
//     app.listen(PORT, () => {
//       console.log(`Servidor rodando em http://localhost:${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.error("Erro ao iniciar o cliente WPPConnect:", err);
//   });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
pool.connect()
  .then(() => console.log('PostgreSQL conectado!'))
  .catch((err) => console.error('Erro ao conectar ao PostgreSQL:', err));


// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
//     res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
//     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//     next();
//   });
const port = 3000

app.get('/pacientes', async (req, res) => {
  try {
    const pacientes = await pool.query('SELECT * FROM PACIENTES')
    res.json(pacientes.rows);
  } catch (error) {
    console.error('Erro ao buscar no banco:', error);
    res.status(500).json({ erro: 'Erro ao inserir usuário' });
  }
})


app.get('/hora', async (req, res) => {
  const result = await pool.query('SELECT NOW()');
  res.send(`Hora atual do banco: ${result.rows[0].now}`);
});

app.post('/cadastro', async (req, res) => {
  const novoUsuario = {
    uuid: uuidv4(), // Gera um UUID único
    nome: req.body.nome,
    cpf: req.body.cpf,
    nsus: req.body.nSUS,
    nascimento: req.body.nascimento,
    preventivo: req.body.preventivo,
    telefone: req.body.telefone,
    risco: req.body.risco,
  };
  console.log(req.body)
  try {
    await pool.query(
      'INSERT INTO pacientes (uuid, nome, cpf, nsus, nascimento, preventivo, telefone, risco) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [novoUsuario.uuid, novoUsuario.nome, novoUsuario.cpf, novoUsuario.nsus, novoUsuario.nascimento, novoUsuario.preventivo, novoUsuario.telefone, novoUsuario.risco]
    );

    res.status(201).json({ id: novoUsuario.uuid, nome: novoUsuario.nome });
  } catch (error) {
    console.error('Erro ao inserir no banco:', error);
    res.status(500).json({ erro: 'Erro ao inserir usuário' });
  }
  // res.send(req.body)
})



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})