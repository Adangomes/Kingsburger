// ==================================================
// CONFIGURAÇÕES GLOBAIS
// ==================================================
let LOJA_ABERTA = true;
let MENSAGEM_FECHADA = "Estamos fechados no momento 😔";
const carrinho = [];

// ==================================================
// SPLASH
// ==================================================
function esconderSplash() {
    const splash = document.getElementById("splash");
    if (!splash) return;

    splash.style.opacity = "0";

    setTimeout(() => {
        splash.style.display = "none";
    }, 600);
}

// ==================================================
// STATUS DA LOJA
// ==================================================
async function carregarStatusLoja() {
    try {
        const res = await fetch("/content/status.json");
        if (!res.ok) return;

        const data = await res.json();
        LOJA_ABERTA = data.aberto;
        MENSAGEM_FECHADA = data.mensagem || MENSAGEM_FECHADA;

        const statusEl = document.getElementById("status-loja");
        if (statusEl) {
            statusEl.textContent = LOJA_ABERTA ? "🟢 ABERTO" : "🔴 FECHADO";
            statusEl.className = `status ${LOJA_ABERTA ? "aberto" : "fechado"}`;
        }
    } catch (e) {
        console.warn("Status da loja não carregado");
    }
}

// ==================================================
// CARRINHO
// ==================================================
function adicionarAoCarrinho(nome, preco) {
    if (!LOJA_ABERTA) {
        alert(MENSAGEM_FECHADA);
        return;
    }

    const item = carrinho.find(i => i.nome === nome);

    if (item) {
        item.quantidade++;
    } else {
        carrinho.push({ nome, preco, quantidade: 1 });
    }

    salvarCarrinho();
    atualizarCarrinho();
    abrirCarrinho();
}

function atualizarCarrinho() {
    const container = document.getElementById("cart-items");
    const subtotalEl = document.getElementById("subtotal");
    if (!container || !subtotalEl) return;

    container.innerHTML = "";
    let subtotal = 0;

    carrinho.forEach((item, index) => {
        subtotal += item.preco * item.quantidade;

        container.innerHTML += `
            <div class="cart-item">
                <span>${item.quantidade}x ${item.nome}</span>
                <button onclick="removerItem(${index})">Excluir</button>
            </div>
        `;
    });

    subtotalEl.innerText =
        `Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}`;
}

function removerItem(index) {
    carrinho.splice(index, 1);
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
// PRODUTOS (NETLIFY CMS - JSON ÚNICO)
// ==================================================
async function carregarProdutos() {
    const res = await fetch("/content/produtos.json");
    if (!res.ok) {
        console.error("produtos.json não encontrado");
        return;
    }

    const data = await res.json();
    const produtos = data.produtos;

    const burgers = document.getElementById("burgers");
    const bebidas = document.getElementById("bebidas");

    burgers.innerHTML = "";
    bebidas.innerHTML = "";

    produtos.forEach(prod => {
        const card = document.createElement("div");
        card.className = "product-card";

        card.innerHTML = `
            <div class="image-wrapper">
                <img src="${prod.image}" alt="${prod.title}">
            </div>
            <div class="content">
                <h3>${prod.title}</h3>
                <p class="desc">${prod.ingredientes || ""}</p>
                <div class="price">
                    R$ ${prod.price.toFixed(2).replace(".", ",")}
                </div>
            </div>
            <button class="btn" onclick="adicionarAoCarrinho('${prod.title}', ${prod.price})">
                +
            </button>
        `;

        if (prod.categoria === "burger") burgers.appendChild(card);
        if (prod.categoria === "bebida") bebidas.appendChild(card);
    });
}


// ==================================================
// INIT
// ==================================================
document.addEventListener("DOMContentLoaded", async () => {
    carregarStatusLoja();
    carregarCarrinhoSalvo();
    atualizarCarrinho();

    try {
        await carregarProdutos();
    } catch (e) {
        console.error("Erro ao carregar produtos:", e);
    }

    esconderSplash(); // 🔥 AGORA O SPLASH SOME
});

