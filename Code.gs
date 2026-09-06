/**
 * HM LOCAÇÕES — CADASTRO DE CLIENTES
 * Code.gs — Google Apps Script (backend)
 *
 * Recebe os dados do formulário (index.html + script.js), valida e
 * sanitiza tudo no servidor, e grava uma nova linha na planilha.
 * Nunca confia apenas nas validações feitas no navegador.
 */

/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */
const SHEET_NAME = "Cadastros";
const TIMEZONE = "America/Sao_Paulo";

const CONSELHOS_VALIDOS = ["CREFITO", "CRM", "CRBM"];
const ACESSOS_VALIDOS = ["Térreo", "Escada", "Elevador"];
const UFS_VALIDAS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO"
];

const CABECALHOS = [
  "Data do cadastro", "Hora do cadastro", "Nome da clínica", "CNPJ",
  "Proprietário", "CPF do proprietário", "Conselho profissional do proprietário",
  "Número do registro", "UF do registro", "CEP", "Endereço", "Número",
  "Complemento", "Bairro", "Cidade", "Estado", "E-mail", "Telefone/WhatsApp",
  "Acesso ao estabelecimento", "Nome do profissional operador",
  "CPF do profissional operador", "Conselho profissional do operador",
  "Número do registro do operador", "UF do registro do operador",
  "Ciência da regra de recebimento", "Ciência do Aviso de Privacidade"
];

/* ============================================================
   ENTRADA HTTP
   ============================================================ */

function doPost(e) {
  try {
    if (!e || !e.parameter) {
      return jsonResponse({ success: false, error: "Requisição inválida." });
    }

    const validation = validateAndSanitize(e.parameter);
    if (!validation.valid) {
      return jsonResponse({ success: false, error: validation.error });
    }

    appendRegistro(validation.data);
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: "Erro interno ao processar o cadastro." });
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput("HM Locações — endpoint de cadastro ativo.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   VALIDAÇÃO E SANITIZAÇÃO (SERVIDOR)
   ============================================================ */

function validateAndSanitize(p) {
  const getText = (key) => sanitizeText(p[key]);

  const clinicaNome = getText("clinicaNome");
  const clinicaCnpj = onlyDigits(p.clinicaCnpj);
  const proprietarioNome = getText("proprietarioNome");
  const proprietarioCpf = onlyDigits(p.proprietarioCpf);
  const proprietarioConselho = getText("proprietarioConselho").toUpperCase();
  const proprietarioRegistroNumero = getText("proprietarioRegistroNumero");
  const proprietarioRegistroUf = getText("proprietarioRegistroUf").toUpperCase();

  const cep = onlyDigits(p.cep);
  const rua = getText("rua");
  const numero = getText("numero");
  const complemento = getText("complemento");
  const bairro = getText("bairro");
  const cidade = getText("cidade");
  const estado = getText("estado").toUpperCase();

  const email = getText("email").toLowerCase();
  const telefone = onlyDigits(p.telefone);
  const acesso = getText("acesso");

  const operadorNome = getText("operadorNome");
  const operadorCpf = onlyDigits(p.operadorCpf);
  const operadorConselho = getText("operadorConselho").toUpperCase();
  const operadorRegistroNumero = getText("operadorRegistroNumero");
  const operadorRegistroUf = getText("operadorRegistroUf").toUpperCase();

  const cienciaOperacional = getText("cienciaOperacional");
  const cienciaPrivacidade = getText("cienciaPrivacidade");

  // Únicos campos obrigatórios do formulário: endereço/local do equipamento
  const obrigatorios = { rua, numero, bairro, cidade };
  for (const campo in obrigatorios) {
    if (!obrigatorios[campo] || obrigatorios[campo].length === 0) {
      return { valid: false, error: "Preencha todos os campos obrigatórios do endereço." };
    }
  }

  if (cep.length !== 8) {
    return { valid: false, error: "CEP inválido ou não informado." };
  }

  if (UFS_VALIDAS.indexOf(estado) === -1) {
    return { valid: false, error: "Estado inválido ou não informado." };
  }

  if (ACESSOS_VALIDOS.indexOf(acesso) === -1) {
    return { valid: false, error: "Tipo de acesso ao estabelecimento inválido ou não informado." };
  }

  // Demais campos são opcionais — validar formato somente quando preenchidos
  if (clinicaCnpj && !isValidCNPJ(clinicaCnpj)) {
    return { valid: false, error: "CNPJ inválido." };
  }

  if (proprietarioCpf && !isValidCPF(proprietarioCpf)) {
    return { valid: false, error: "CPF do proprietário inválido." };
  }

  if (proprietarioConselho && CONSELHOS_VALIDOS.indexOf(proprietarioConselho) === -1) {
    return { valid: false, error: "Conselho profissional do proprietário inválido." };
  }

  if (proprietarioRegistroUf && UFS_VALIDAS.indexOf(proprietarioRegistroUf) === -1) {
    return { valid: false, error: "UF do registro do proprietário inválida." };
  }

  if (email && !isValidEmail(email)) {
    return { valid: false, error: "E-mail inválido." };
  }

  if (telefone && telefone.length !== 10 && telefone.length !== 11) {
    return { valid: false, error: "Telefone/WhatsApp inválido." };
  }

  if (operadorCpf && !isValidCPF(operadorCpf)) {
    return { valid: false, error: "CPF do profissional operador inválido." };
  }

  if (operadorConselho && CONSELHOS_VALIDOS.indexOf(operadorConselho) === -1) {
    return { valid: false, error: "Conselho profissional do operador inválido." };
  }

  if (operadorRegistroUf && UFS_VALIDAS.indexOf(operadorRegistroUf) === -1) {
    return { valid: false, error: "UF do registro do operador inválida." };
  }

  return {
    valid: true,
    data: {
      clinicaNome, clinicaCnpj, proprietarioNome, proprietarioCpf,
      proprietarioConselho, proprietarioRegistroNumero, proprietarioRegistroUf,
      cep, rua, numero, complemento, bairro, cidade, estado,
      email, telefone, acesso,
      operadorNome, operadorCpf, operadorConselho,
      operadorRegistroNumero, operadorRegistroUf,
      cienciaOperacional, cienciaPrivacidade
    }
  };
}

/* ============================================================
   GRAVAÇÃO NA PLANILHA
   ============================================================ */

function appendRegistro(d) {
  const sheet = getSheet();
  ensureHeaders(sheet);

  const agora = new Date();
  const dataCadastro = Utilities.formatDate(agora, TIMEZONE, "dd/MM/yyyy");
  const horaCadastro = Utilities.formatDate(agora, TIMEZONE, "HH:mm:ss");

  const linha = [
    dataCadastro,
    horaCadastro,
    safeCell(d.clinicaNome),
    safeCell(formatCNPJ(d.clinicaCnpj)),
    safeCell(d.proprietarioNome),
    safeCell(formatCPF(d.proprietarioCpf)),
    safeCell(d.proprietarioConselho),
    safeCell(d.proprietarioRegistroNumero),
    safeCell(d.proprietarioRegistroUf),
    safeCell(formatCEP(d.cep)),
    safeCell(d.rua),
    safeCell(d.numero),
    safeCell(d.complemento),
    safeCell(d.bairro),
    safeCell(d.cidade),
    safeCell(d.estado),
    safeCell(d.email),
    safeCell(formatPhone(d.telefone)),
    safeCell(d.acesso),
    safeCell(d.operadorNome),
    safeCell(formatCPF(d.operadorCpf)),
    safeCell(d.operadorConselho),
    safeCell(d.operadorRegistroNumero),
    safeCell(d.operadorRegistroUf),
    safeCell(d.cienciaOperacional),
    safeCell(d.cienciaPrivacidade)
  ];

  sheet.appendRow(linha);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.getSheets()[0];
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CABECALHOS);
    sheet.getRange(1, 1, 1, CABECALHOS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
}

/* ============================================================
   SANITIZAÇÃO / FORMATAÇÃO
   ============================================================ */

function sanitizeText(value) {
  if (value === undefined || value === null) return "";
  let text = String(value).trim();
  text = text.replace(/[\r\n\t]+/g, " ");
  return text.substring(0, 300);
}

// Evita injeção de fórmulas ao gravar valores na planilha (=, +, -, @).
function safeCell(value) {
  const text = String(value === undefined || value === null ? "" : value);
  if (/^[=+\-@]/.test(text)) {
    return "'" + text;
  }
  return text;
}

function onlyDigits(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\D/g, "");
}

function formatCNPJ(digits) {
  if (digits.length !== 14) return digits;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatCPF(digits) {
  if (digits.length !== 11) return digits;
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

function formatCEP(digits) {
  if (digits.length !== 8) return digits;
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

function formatPhone(digits) {
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return digits;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidCPF(cpf) {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf[10], 10)) return false;

  return true;
}

function isValidCNPJ(cnpj) {
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base) => {
    const length = base.length;
    let pos = length - 7;
    let sum = 0;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(base.charAt(length - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };

  const base12 = cnpj.substring(0, 12);
  if (calcDigit(base12) !== parseInt(cnpj.charAt(12), 10)) return false;

  const base13 = cnpj.substring(0, 13);
  if (calcDigit(base13) !== parseInt(cnpj.charAt(13), 10)) return false;

  return true;
}
