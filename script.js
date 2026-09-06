/* ==========================================================================
   HM LOCAÇÕES — CADASTRO DE CLIENTES
   script.js
   ========================================================================== */

/* ============================================================
   CONFIGURAÇÃO — altere aqui o essencial do sistema
   ============================================================ */
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw1ZYUd4SzW0qK4cY6uEWF-mo7mAqRhicmZCtC9ze4Boq7zAbXaYWtoDpnKXu-qnmieTA/exec";

const APP_CONFIG = {
  empresa: "HM Locações de Equipamentos Médicos",
  mensagens: {
    erroEnvio: {
      titulo: "Não foi possível concluir seu cadastro.",
      texto: "Verifique sua conexão e tente novamente."
    },
    erroConfig: {
      titulo: "Cadastro temporariamente indisponível.",
      texto: "Entre em contato com a HM Locações para concluir seu cadastro."
    }
  }
};

/* ============================================================
   LISTA DE UFs
   ============================================================ */
const UF_LIST = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"],
  ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"],
  ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
  ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"],
  ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"]
];

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  populateUfSelects();
  setupMasks();
  setupViaCep();
  setupFooterYear();
  setupFormSubmit();
});

function setupFooterYear() {
  const el = document.getElementById("anoAtual");
  if (el) el.textContent = new Date().getFullYear();
}

function populateUfSelects() {
  const selects = [
    document.getElementById("estado"),
    document.getElementById("proprietarioRegistroUf"),
    document.getElementById("operadorRegistroUf")
  ];
  selects.forEach((select) => {
    if (!select) return;
    UF_LIST.forEach(([sigla, nome]) => {
      const opt = document.createElement("option");
      opt.value = sigla;
      opt.textContent = `${sigla} — ${nome}`;
      select.appendChild(opt);
    });
  });
}

/* ============================================================
   MÁSCARAS
   ============================================================ */

function onlyDigits(value) {
  return (value || "").replace(/\D/g, "");
}

function maskCNPJ(value) {
  value = onlyDigits(value).slice(0, 14);
  value = value.replace(/^(\d{2})(\d)/, "$1.$2");
  value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
  value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
  value = value.replace(/(\d{4})(\d)/, "$1-$2");
  return value;
}

function maskCPF(value) {
  value = onlyDigits(value).slice(0, 11);
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return value;
}

function maskCEP(value) {
  value = onlyDigits(value).slice(0, 8);
  value = value.replace(/^(\d{5})(\d{0,3})/, "$1-$2");
  return value.replace(/-$/, "");
}

function maskPhone(value) {
  value = onlyDigits(value).slice(0, 11);
  if (value.length > 10) {
    value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
  } else if (value.length > 6) {
    value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  } else if (value.length > 2) {
    value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  } else if (value.length > 0) {
    value = value.replace(/^(\d*)/, "($1");
  }
  return value;
}

function setupMasks() {
  bindMask("clinicaCnpj", maskCNPJ);
  bindMask("proprietarioCpf", maskCPF);
  bindMask("operadorCpf", maskCPF);
  bindMask("cep", maskCEP);
  bindMask("telefone", maskPhone);
}

function bindMask(id, maskFn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", () => {
    const cursorFromEnd = el.value.length - el.selectionStart;
    el.value = maskFn(el.value);
    const pos = el.value.length - cursorFromEnd;
    el.setSelectionRange(pos, pos);
  });
}

/* ============================================================
   VALIDADORES
   ============================================================ */

function isBlank(value) {
  return !value || value.trim().length === 0;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidCEPFormat(value) {
  return /^\d{5}-?\d{3}$/.test(onlyDigits(value).length === 8 ? value : "");
}

function isValidPhone(value) {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

function isValidCPF(cpfRaw) {
  const cpf = onlyDigits(cpfRaw);
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

function isValidCNPJ(cnpjRaw) {
  const cnpj = onlyDigits(cnpjRaw);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base) => {
    let length = base.length;
    let pos = length - 7;
    let sum = 0;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(base.charAt(length - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result;
  };

  const base12 = cnpj.substring(0, 12);
  const digit1 = calcDigit(base12);
  if (digit1 !== parseInt(cnpj.charAt(12), 10)) return false;

  const base13 = cnpj.substring(0, 13);
  const digit2 = calcDigit(base13);
  if (digit2 !== parseInt(cnpj.charAt(13), 10)) return false;

  return true;
}

/* ============================================================
   VIA CEP
   ============================================================ */

function setupViaCep() {
  const cepInput = document.getElementById("cep");
  if (!cepInput) return;

  cepInput.addEventListener("blur", () => tryFetchCep(cepInput.value));
  cepInput.addEventListener("input", () => {
    if (onlyDigits(cepInput.value).length === 8) {
      tryFetchCep(cepInput.value);
    }
  });
}

async function tryFetchCep(rawCep) {
  const cep = onlyDigits(rawCep);
  if (cep.length !== 8) return;

  const ruaEl = document.getElementById("rua");
  const bairroEl = document.getElementById("bairro");
  const cidadeEl = document.getElementById("cidade");
  const estadoEl = document.getElementById("estado");

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) return;
    const data = await response.json();
    if (data.erro) return;

    if (ruaEl && data.logradouro) ruaEl.value = data.logradouro;
    if (bairroEl && data.bairro) bairroEl.value = data.bairro;
    if (cidadeEl && data.localidade) cidadeEl.value = data.localidade;
    if (estadoEl && data.uf) estadoEl.value = data.uf;

    clearFieldError("rua");
    clearFieldError("bairro");
    clearFieldError("cidade");
    clearFieldError("estado");
    clearFieldError("cep");
  } catch (e) {
    /* Falha silenciosa: usuário preenche manualmente. */
  }
}

/* ============================================================
   ERROS DE CAMPO
   ============================================================ */

function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`err-${fieldId}`);
  if (errorEl) errorEl.textContent = message;
  if (input) {
    input.setAttribute("aria-invalid", "true");
    const fieldWrapper = input.closest(".field") || input.closest("fieldset");
    if (fieldWrapper) {
      fieldWrapper.classList.add("has-error");
      fieldWrapper.classList.remove("is-valid");
    }
  }
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`err-${fieldId}`);
  if (errorEl) errorEl.textContent = "";
  if (input) {
    input.setAttribute("aria-invalid", "false");
    const fieldWrapper = input.closest(".field") || input.closest("fieldset");
    if (fieldWrapper) {
      fieldWrapper.classList.remove("has-error");
      fieldWrapper.classList.add("is-valid");
    }
  }
}

function clearAllErrors() {
  document.querySelectorAll(".error-message").forEach((el) => (el.textContent = ""));
  document.querySelectorAll(".has-error").forEach((el) => el.classList.remove("has-error"));
}

/* ============================================================
   VALIDAÇÃO COMPLETA DO FORMULÁRIO
   ============================================================ */

function validateForm() {
  clearAllErrors();
  let firstErrorField = null;

  const markError = (fieldId, message, focusEl) => {
    setFieldError(fieldId, message);
    if (!firstErrorField) firstErrorField = focusEl || document.getElementById(fieldId);
  };

  const get = (id) => document.getElementById(id).value;

  // Dados da clínica — todos opcionais; quando preenchidos, validar formato
  const cnpj = get("clinicaCnpj");
  if (!isBlank(cnpj) && !isValidCNPJ(cnpj)) markError("clinicaCnpj", "CNPJ inválido.");

  const propCpf = get("proprietarioCpf");
  if (!isBlank(propCpf) && !isValidCPF(propCpf)) markError("proprietarioCpf", "CPF inválido.");

  // Endereço — únicos campos obrigatórios do formulário
  const cep = get("cep");
  if (isBlank(cep)) markError("cep", "Informe o CEP.");
  else if (onlyDigits(cep).length !== 8) markError("cep", "CEP inválido.");

  if (isBlank(get("rua"))) markError("rua", "Informe a rua ou avenida.");
  if (isBlank(get("numero"))) markError("numero", "Informe o número.");
  if (isBlank(get("bairro"))) markError("bairro", "Informe o bairro.");
  if (isBlank(get("cidade"))) markError("cidade", "Informe a cidade.");
  if (isBlank(get("estado"))) markError("estado", "Selecione o estado.");

  // Contato — opcionais; quando preenchidos, validar formato
  const email = get("email");
  if (!isBlank(email) && !isValidEmail(email)) markError("email", "E-mail inválido.");

  const telefone = get("telefone");
  if (!isBlank(telefone) && !isValidPhone(telefone)) markError("telefone", "Telefone inválido.");

  // Acesso ao estabelecimento — obrigatório
  const acessoSelecionado = document.querySelector('input[name="acesso"]:checked');
  if (!acessoSelecionado) {
    const acessoGroup = document.getElementById("acessoGroup");
    acessoGroup.classList.add("has-error");
    document.getElementById("err-acesso").textContent = "Selecione o tipo de acesso ao estabelecimento.";
    if (!firstErrorField) firstErrorField = document.getElementById("acesso-terreo");
  }

  // Profissional operador — opcional; CPF validado somente se preenchido
  const opCpf = get("operadorCpf");
  if (!isBlank(opCpf) && !isValidCPF(opCpf)) markError("operadorCpf", "CPF inválido.");

  return { valid: !firstErrorField, firstErrorField };
}

/* ============================================================
   ENVIO DO FORMULÁRIO
   ============================================================ */

let isSubmitting = false;

function setupFormSubmit() {
  const form = document.getElementById("cadastro-form");
  const submitBtn = document.getElementById("submitBtn");
  const submitLabel = submitBtn.querySelector(".btn-submit__label");
  const submitError = document.getElementById("submitError");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    submitError.hidden = true;

    const { valid, firstErrorField } = validateForm();
    if (!valid) {
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof firstErrorField.focus === "function") firstErrorField.focus();
      }
      return;
    }

    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.indexOf("COLE_AQUI") !== -1) {
      submitError.querySelector("strong").textContent = APP_CONFIG.mensagens.erroConfig.titulo;
      submitError.querySelectorAll("p")[1].textContent = APP_CONFIG.mensagens.erroConfig.texto;
      submitError.hidden = false;
      return;
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    submitLabel.textContent = "ENVIANDO CADASTRO...";

    try {
      const payload = buildPayload();
      const formData = new FormData();
      Object.keys(payload).forEach((key) => formData.append(key, payload[key]));

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (result && result.success) {
        showSuccessScreen();
      } else {
        showSubmitError();
      }
    } catch (err) {
      showSubmitError();
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-loading");
      submitLabel.textContent = "ENVIAR CADASTRO";
    }
  });
}

function buildPayload() {
  const get = (id) => document.getElementById(id).value.trim();
  const acesso = document.querySelector('input[name="acesso"]:checked');

  return {
    clinicaNome: get("clinicaNome"),
    clinicaCnpj: onlyDigits(get("clinicaCnpj")),
    proprietarioNome: get("proprietarioNome"),
    proprietarioCpf: onlyDigits(get("proprietarioCpf")),
    proprietarioConselho: get("proprietarioConselho"),
    proprietarioRegistroNumero: get("proprietarioRegistroNumero"),
    proprietarioRegistroUf: get("proprietarioRegistroUf"),
    cep: onlyDigits(get("cep")),
    rua: get("rua"),
    numero: get("numero"),
    complemento: get("complemento"),
    bairro: get("bairro"),
    cidade: get("cidade"),
    estado: get("estado"),
    email: get("email"),
    telefone: onlyDigits(get("telefone")),
    acesso: acesso ? acesso.value : "",
    operadorNome: get("operadorNome"),
    operadorCpf: onlyDigits(get("operadorCpf")),
    operadorConselho: get("operadorConselho"),
    operadorRegistroNumero: get("operadorRegistroNumero"),
    operadorRegistroUf: get("operadorRegistroUf"),
    cienciaOperacional: document.getElementById("cienciaOperacional").checked ? "Sim" : "Não",
    cienciaPrivacidade: document.getElementById("cienciaPrivacidade").checked ? "Sim" : "Não"
  };
}

function showSuccessScreen() {
  const form = document.getElementById("cadastro-form");
  const successScreen = document.getElementById("successScreen");
  form.hidden = true;
  successScreen.hidden = false;
  successScreen.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showSubmitError() {
  const submitError = document.getElementById("submitError");
  submitError.querySelector("strong").textContent = APP_CONFIG.mensagens.erroEnvio.titulo;
  submitError.querySelectorAll("p")[1].textContent = APP_CONFIG.mensagens.erroEnvio.texto;
  submitError.hidden = false;
  submitError.scrollIntoView({ behavior: "smooth", block: "center" });
}
