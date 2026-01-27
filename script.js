// ==================================================
// GEOAPIFY
// ==================================================
const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775"; // usa a do Netlify

// ==================================================
// UTIL
// ==================================================
function normalizar(txt) {
    return txt
        ? txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        : "";
}

// ==================================================
// CONFIGURAÇÕES GLOBAIS
// ==================================================
let LOJA_ABERTA = true;
let MENSAGEM_FECHADA = "Estamos fechados no momento 😔";
const carrinho = [];

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
// PRODUTOS
// ==================================================
async function carregarProdutos() {
    try {
        const res = await fetch("/content/produtos.json");
        const data = await res.json();

        const burgers = document.getElementById("burgers");
        const bebidas = document.getElementById("bebidas");

        data.produtos.forEach(p => {
            const card = document.createElement("div");
            card.className = "product-card";

            card.innerHTML = `
                <img src="${p.image}" alt="${p.title}">
                <h3>${p.title}</h3>
                <p class="desc">${p.ingredientes || ""}</p>
                <p class="price">R$ ${p.price.toFixed(2).replace(".", ",")}</p>
                <button onclick="adicionarAoCarrinho('${p.title}', ${p.price})">
                    Adicionar
                </button>
            `;

            if (p.categoria === "burger" && burgers) burgers.appendChild(card);
            if (p.categoria === "bebida" && bebidas) bebidas.appendChild(card);
        });
    } catch (e) {
        console.error("Erro produtos", e);
    }
}

// ==================================================
// CARRINHO
// ==================================================
function adicionarAoCarrinho(nome, preco) {
    if (!LOJA_ABERTA) return alert(MENSAGEM_FECHADA);

    const item = carrinho.find(i => i.nome === nome);
    if (item) item.qtd++;
    else carrinho.push({ nome, preco, qtd: 1 });

    salvarCarrinho();
    atualizarCarrinho();
    abrirCarrinho();
}

function atualizarCarrinho() {
    const el = document.getElementById("cart-items");
    if (!el) return;

    el.innerHTML = "";
    let subtotal = 0;

    carrinho.forEach((i, idx) => {
        subtotal += i.preco * i.qtd;
        el.innerHTML += `
            <div class="cart-item">
                <span>${i.qtd}x ${i.nome}</span>
                <button onclick="removerItem(${idx})">Excluir</button>
            </div>
        `;
    });

    document.getElementById("subtotal").innerText =
        `Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}`;
    document.getElementById("total").innerText =
        `Total: R$ ${subtotal.toFixed(2).replace(".", ",")}`;
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
// BAIRROS
// ==================================================
const bairrosJaragua = [
    "Centro", "Amizade", "Baependi", "Barra do Rio Cerro", "Boa Vista",
    "Ilha da Figueira", "Jaraguá Esquerdo", "Nova Brasília", "Rau",
    "Três Rios do Norte", "Vila Nova"
];

const bairrosGuaramirim = [
    "Centro", "Avaí", "Corticeira", "Escolinha"
];

function carregarBairros() {
    const cidade = document.getElementById("cidade").value;
    const bairro = document.getElementById("bairro");

    bairro.innerHTML = "<option value=''>Selecione</option>";
    const lista = cidade === "jaragua" ? bairrosJaragua : bairrosGuaramirim;

    lista.forEach(b => {
        const o = document.createElement("option");
        o.value = b;
        o.textContent = b;
        bairro.appendChild(o);
    });
}

// ==================================================
// TAXA ENTREGA
// ==================================================
function calcularTaxaEntrega(cidade, bairro) {
    cidade = normalizar(cidade);
    bairro = normalizar(bairro);

    if (cidade === "jaragua") {
        if (bairro === "vila nova") return 5;
        if (bairro === "centro") return 7;
        if (bairro === "baependi") return 6;
        return 12;
    }

    if (cidade === "guaramirim") {
        if (bairro === "centro") return 15;
        if (bairro === "corticeira") return 30;
        return 22;
    }
    return 0;
}

// ==================================================
// AUTOCOMPLETE DE RUA (GEOAPIFY)
// ==================================================
async function autocompleteRua(texto, cidade, container, onSelect) {
    if (texto.length < 2) return (container.innerHTML = "");

    const cidadeFiltro =
        cidade === "jaragua" ? "Jaraguá do Sul" :
        cidade === "guaramirim" ? "Guaramirim" : "";

    if (!cidadeFiltro) return;

    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
        texto + " " + cidadeFiltro
    )}&filter=countrycode:br&limit=6&apiKey=${GEOAPIFY_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    container.innerHTML = "";
    if (!data.features) return;

    data.features.forEach(f => {
        const rua = f.properties.address_line1;
        if (!rua) return;

        const div = document.createElement("div");
        div.className = "sugestao-rua";
        div.textContent = rua;

        div.onclick = () => {
            onSelect(rua);
            container.innerHTML = "";
        };
        container.appendChild(div);
    });
}

// ==================================================
// SPLASH
// ==================================================
function initSplash() {
    const splash = document.getElementById("splash");
    if (!splash) return;

    setTimeout(() => {
        splash.classList.add("hide");
        setTimeout(() => splash.remove(), 500);
    }, 1500);
}

// ==================================================
// INIT
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
    carregarStatusLoja();
    carregarCarrinhoSalvo();
    atualizarCarrinho();
    carregarProdutos();
    initSplash();

    const rua = document.getElementById("rua");
    const cidade = document.getElementById("cidade");

    if (rua && cidade) {
        const sug = document.createElement("div");
        sug.id = "rua-sugestoes";
        sug.style.position = "absolute";
        sug.style.background = "#fff";
        sug.style.zIndex = "999";
        rua.parentNode.style.position = "relative";
        rua.parentNode.appendChild(sug);

        rua.addEventListener("input", () => {
            autocompleteRua(
                rua.value.replace(/[0-9]/g, ""),
                cidade.value,
                sug,
                r => {
                    rua.value = r;
                    document.getElementById("numero").focus();
                }
            );
        });
    }
});
