// ==================================================
// GEOAPIFY (AUTOCOMPLETE DE RUA REAL)
// ==================================================
const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";

// ==================================================
// CONFIGURAÇÕES GLOBAIS
// ==================================================
let LOJA_ABERTA = true;
let MENSAGEM_FECHADA = "Estamos fechados no momento 😔";
const carrinho = [];

// ==================================================
// NORMALIZA TEXTO
// ==================================================
function normalizar(txt) {
    return txt
        ? txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        : "";
}

// ==================================================
// STATUS DA LOJA
// ==================================================
async function carregarStatusLoja() {
    try {
        const res = await fetch("/content/status.json");
        const data = await res.json();

        LOJA_ABERTA = data.aberto;
        MENSAGEM_FECHADA = data.mensagem || MENSAGEM_FECHADA;

        const el = document.getElementById("status-loja");
        if (el) {
            el.textContent = LOJA_ABERTA ? "🟢 ABERTO" : "🔴 FECHADO";
            el.className = LOJA_ABERTA ? "aberto" : "fechado";
        }
    } catch (e) {
        console.error("Erro status loja", e);
    }
}

// ==================================================
// CARRINHO
// ==================================================
function adicionarAoCarrinho(nome, codigo, preco) {
    if (!LOJA_ABERTA) return alert(MENSAGEM_FECHADA);

    const item = carrinho.find(i => i.nome === nome);
    item ? item.quantidade++ : carrinho.push({ nome, codigo, preco, quantidade: 1 });

    salvarCarrinho();
    atualizarCarrinho();
    abrirCarrinho();
}

function atualizarCarrinho() {
    const box = document.getElementById("cart-items");
    if (!box) return;

    box.innerHTML = "";
    let subtotal = 0;

    carrinho.forEach((i, idx) => {
        subtotal += i.preco * i.quantidade;
        box.innerHTML += `
            <div class="cart-item">
                <span>${i.quantidade}x ${i.nome}</span>
                <button onclick="removerItem(${idx})">Excluir</button>
            </div>`;
    });

    document.getElementById("subtotal").innerText = `Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}`;
    document.getElementById("total").innerText = `Total: R$ ${subtotal.toFixed(2).replace(".", ",")}`;
}

function removerItem(i) {
    carrinho.splice(i, 1);
    salvarCarrinho();
    atualizarCarrinho();
}

function salvarCarrinho() {
    localStorage.setItem("meuCarrinho", JSON.stringify(carrinho));
}

function carregarCarrinhoSalvo() {
    const salvo = localStorage.getItem("meuCarrinho");
    if (salvo) carrinho.push(...JSON.parse(salvo));
}

function limparCarrinho() {
    carrinho.length = 0;
    localStorage.removeItem("meuCarrinho");
    atualizarCarrinho();
}

// ==================================================
// MODAIS
// ==================================================
function abrirCarrinho() {
    document.getElementById("cart-modal").style.display = "flex";
}
function fecharCarrinho() {
    document.getElementById("cart-modal").style.display = "none";
}
function abrirDelivery() {
    fecharCarrinho();
    document.getElementById("delivery-modal").style.display = "flex";
}
function fecharDelivery() {
    document.getElementById("delivery-modal").style.display = "none";
}

// ==================================================
// PRODUTOS
// ==================================================
async function carregarProdutos() {
    const res = await fetch("/content/produtos.json");
    const data = await res.json();

    data.produtos.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <img src="${p.image}">
            <h3>${p.title}</h3>
            <p>${p.ingredientes || ""}</p>
            <strong>R$ ${p.price.toFixed(2).replace(".", ",")}</strong>
            <button onclick="adicionarAoCarrinho('${p.title}','${p.title}',${p.price})">
                Adicionar
            </button>
        `;
        document.getElementById(p.categoria === "burger" ? "burgers" : "bebidas")
            ?.appendChild(card);
    });
}

// ==================================================
// BAIRROS (NÃO APAGUEI NADA 😅)
// ==================================================
const bairrosJaragua = [
    "Centro","Amizade","Baependi","Barra do Rio Cerro","Boa Vista",
    "Czerniewicz","Ilha da Figueira","Jaraguá 84","Jaraguá Esquerdo",
    "João Pessoa","Nova Brasília","Nereu Ramos","Rau","Rio Cerro I",
    "Rio Cerro II","Rio da Luz","Tifa Martins","Vila Nova",
    "Três Rios do Sul","Três Rios do Norte","Vieira","Vila Lenzi"
];

const bairrosGuaramirim = [
    "Centro","Amizade","Avaí","Bananal do Sul","Corticeira",
    "Figueirinha","Guamiranga","Imigrantes","João Pessoa",
    "Nova Esperança","Recanto Feliz","Rio Branco","Rua Nova",
    "Seleção","Escolinha"
];

function carregarBairros() {
    const cidade = document.getElementById("cidade").value;
    const bairro = document.getElementById("bairro");
    bairro.innerHTML = "<option value=''>Selecione</option>";

    const lista = cidade === "jaragua" ? bairrosJaragua : bairrosGuaramirim;
    lista.forEach(b => bairro.innerHTML += `<option>${b}</option>`);
}

// ==================================================
// AUTOCOMPLETE DE RUA REAL (FUNCIONAL)
// ==================================================
async function autocompleteRua(texto, cidade, container, onSelect) {
    if (texto.length < 3) return container.innerHTML = "";

    const cidadeFiltro =
        cidade === "jaragua" ? "Jaraguá do Sul SC" :
        cidade === "guaramirim" ? "Guaramirim SC" : "";

    if (!cidadeFiltro) return;

    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
        texto + ", " + cidadeFiltro
    )}&filter=countrycode:br&limit=6&apiKey=${GEOAPIFY_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    container.innerHTML = "";
    data.features?.forEach(f => {
        const endereco = f.properties.formatted;
        const div = document.createElement("div");
        div.className = "sugestao-rua";
        div.textContent = endereco;
        div.onclick = () => onSelect(endereco);
        container.appendChild(div);
    });
}

// ==================================================
// SPLASH
// ==================================================
function initSplash() {
    const s = document.getElementById("splash");
    if (!s) return;
    setTimeout(() => {
        s.classList.add("hide");
        setTimeout(() => s.style.display = "none", 500);
    }, 1500);
}

// ==================================================
// INIT FINAL
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
    carregarStatusLoja();
    carregarCarrinhoSalvo();
    atualizarCarrinho();
    carregarProdutos();
    initSplash();

    const rua = document.getElementById("rua");
    const cidade = document.getElementById("cidade");

    const sug = document.createElement("div");
    sug.id = "rua-sugestoes";
    sug.className = "sugestoes";
    rua.parentNode.appendChild(sug);

    rua.addEventListener("input", () => {
        autocompleteRua(rua.value, cidade.value, sug, r => {
            rua.value = r;
            sug.innerHTML = "";
            document.getElementById("numero").focus();
        });
    });
});
