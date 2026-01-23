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
        if (!res.ok) return;

        const data = await res.json();
        LOJA_ABERTA = data.aberto;
        MENSAGEM_FECHADA = data.mensagem || MENSAGEM_FECHADA;

        const statusEl = document.getElementById("status-loja");
        if (statusEl) {
            statusEl.textContent = LOJA_ABERTA ? "🟢 ABERTO" : "🔴 FECHADO";
            statusEl.className = LOJA_ABERTA ? "aberto" : "fechado";
        }
    } catch (e) {
        console.warn("Status da loja não carregado");
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

    const item = carrinho.find(i => i.codigo === codigo);

    if (item) item.quantidade++;
    else carrinho.push({ nome, codigo, preco, quantidade: 1 });

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
                <span>${item.quantidade}x ${item.nome}</span>
                <button onclick="removerItem(${index})">Excluir</button>
            </div>
        `;
    });

    const subtotalEl = document.getElementById("subtotal");
    if (subtotalEl) {
        subtotalEl.innerText =
            `Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}`;
    }
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
const cartModal = document.getElementById("cart-modal");
const deliveryModal = document.getElementById("delivery-modal");
const deliveryBox = deliveryModal?.querySelector(".delivery-box");
const resumo = document.getElementById("resumo-pedido");

function abrirCarrinho() {
    if (cartModal) cartModal.style.display = "flex";
}

function fecharCarrinho() {
    if (cartModal) cartModal.style.display = "none";
}

function abrirDelivery() {
    fecharCarrinho();
    if (!deliveryModal) return;
    deliveryModal.style.display = "flex";
    if (resumo) resumo.style.display = "none";
    deliveryBox?.classList.remove("exit");
}

function abrirResumo() {
    deliveryBox?.classList.add("exit");
    setTimeout(() => {
        if (deliveryModal) deliveryModal.style.display = "none";
        if (resumo) resumo.style.display = "block";
    }, 300);
}

function voltarFormulario() {
    if (resumo) resumo.style.display = "none";
    if (deliveryModal) deliveryModal.style.display = "flex";
    deliveryBox?.classList.remove("exit");
}

// ==================================================
// PRODUTOS (NETLIFY CMS)
// ==================================================
async function carregarProdutos() {
    try {
        const res = await fetch('/content/produtos/');
        if (!res.ok) throw new Error("Pasta produtos não acessível");

        const files = await res.json();

        const containers = {
            burger: document.getElementById("burgers"),
            bebida: document.getElementById("bebidas")
        };

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const prodRes = await fetch(`/content/produtos/${file}`);
            const prod = await prodRes.json();

            if (!containers[prod.categoria]) continue;

            const card = document.createElement("div");
            card.className = "product-card";
            card.innerHTML = `
                <img src="${prod.image || ''}" alt="${prod.title}">
                <h3>${prod.title}</h3>
                <p>${prod.ingredientes || ''}</p>
                <strong>R$ ${Number(prod.price).toFixed(2).replace(".", ",")}</strong>
                <button onclick="adicionarAoCarrinho(
                    '${prod.title}',
                    '${file}',
                    ${prod.price}
                )">
                    Adicionar
                </button>
            `;

            containers[prod.categoria].appendChild(card);
        }

    } catch (e) {
        console.error("Erro ao carregar produtos:", e);
    }
}

// ==================================================
// INIT
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
    carregarStatusLoja();
    carregarCarrinhoSalvo();
    atualizarCarrinho();
    carregarProdutos();
});





#splash {
    transition: opacity 0.6s ease;
}

