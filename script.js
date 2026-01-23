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
        const res = await fetch('/content/status.json');
        const data = await res.json();

        LOJA_ABERTA = data.aberto;
        MENSAGEM_FECHADA = data.mensagem || MENSAGEM_FECHADA;

        const statusEl = document.getElementById("status-loja");
        if (statusEl) {
            statusEl.textContent = LOJA_ABERTA ? "🟢 ABERTO" : "🔴 FECHADO";
            statusEl.className = LOJA_ABERTA ? "aberto" : "fechado";
        }
    } catch (e) {
        console.error("Erro ao carregar status da loja", e);
    }
}

// ==================================================
// CARRINHO
// ==================================================
function adicionarAoCarrinho(nome, codigo, preco) {
    if (!LOJA_ABERTA) {
        alert(MENSAGEM_FECHADA);
        return;
    }

    const precoNum = Number(preco);
    const existente = carrinho.find(
        i => i.nome === nome && i.codigo === codigo
    );

    if (existente) {
        existente.quantidade++;
    } else {
        carrinho.push({ nome, codigo, preco: precoNum, quantidade: 1 });
    }

    salvarCarrinho();
    atualizarCarrinho();
    abrirCarrinho();
}

function atualizarCarrinho() {
    const container = document.getElementById("cart-items");
    if (!container) return;

    container.innerHTML = "";
    let subtotal = 0;

    carrinho.forEach((item, index) => {
        subtotal += item.preco * item.quantidade;

        container.innerHTML += `
            <div class="cart-item">
                <div>${item.quantidade}x ${item.nome}</div>
                <button onclick="removerItem(${index})">Excluir</button>
            </div>
        `;
    });

    document.getElementById("subtotal").innerText =
        `Subtotal: R$${subtotal.toFixed(2).replace(".", ",")}`;
    document.getElementById("total").innerText =
        `Total: R$${subtotal.toFixed(2).replace(".", ",")}`;
}

function removerItem(index) {
    carrinho.splice(index, 1);
    salvarCarrinho();
    atualizarCarrinho();
}

function limparCarrinho() {
    carrinho.length = 0;
    localStorage.removeItem("meuCarrinho");
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
// CARREGAR PRODUTOS DO JSON
// ==================================================
async function carregarProdutos() {
    try {
        const res = await fetch('/content/produtos.json');
        const data = await res.json();

        const burgersEl = document.getElementById("burgers");
        const bebidasEl = document.getElementById("bebidas");

        data.produtos.forEach(prod => {
            const card = document.createElement("div");
            card.className = "product-card";

            card.innerHTML = `
                <img src="${prod.image}" alt="${prod.title}">
                <h3>${prod.title}</h3>
                <p class="desc">${prod.ingredientes || ""}</p>
                <p class="price">R$ ${prod.price.toFixed(2).replace(".", ",")}</p>
                <button class="btn"
                    onclick="adicionarAoCarrinho('${prod.title}', '${prod.title}', ${prod.price})">
                    Adicionar
                </button>
            `;

            // 🍔 SOMENTE BURGERS NA HOME
            if (prod.categoria === "burger" && burgersEl) {
                burgersEl.appendChild(card);
            }

            // 🥤 SOMENTE BEBIDAS NA PAGINA DE BEBIDAS
            if (prod.categoria === "bebida" && bebidasEl) {
                bebidasEl.appendChild(card);
            }
        });

    } catch (e) {
        console.error("Erro ao carregar produtos", e);
    }
}

// ==================================================
// MENU MOBILE
// ==================================================
function initMenuMobile() {
    const hamburger = document.getElementById("hamburger");
    const menu = document.getElementById("mobile-menu");

    if (hamburger && menu) {
        hamburger.onclick = () => menu.classList.toggle("active");
    }
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
// INIT GERAL
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
    carregarStatusLoja();
    carregarCarrinhoSalvo();
    atualizarCarrinho();
    carregarProdutos();
    initMenuMobile();
    initSplash();
});
