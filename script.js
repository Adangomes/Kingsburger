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

    const existente = carrinho.find(i => i.nome === nome && i.codigo === codigo);

    if (existente) existente.quantidade++;
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

    document.getElementById("subtotal").innerText =
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
const cartModal = document.getElementById("cart-modal");
const deliveryModal = document.getElementById("delivery-modal");
const deliveryBox = deliveryModal?.querySelector(".delivery-box");
const resumo = document.getElementById("resumo-pedido");

function abrirCarrinho() {
    cartModal.style.display = "flex";
}
function fecharCarrinho() {
    cartModal.style.display = "none";
}

function abrirDelivery() {
    fecharCarrinho();
    deliveryModal.style.display = "flex";
    resumo.style.display = "none";
    deliveryBox.classList.remove("exit");
}

function abrirResumo() {
    deliveryBox.classList.add("exit");
    setTimeout(() => {
        deliveryModal.style.display = "none";
        resumo.style.display = "block";
    }, 300);
}

function voltarFormulario() {
    resumo.style.display = "none";
    deliveryModal.style.display = "flex";
    deliveryBox.classList.remove("exit");
}

// ==================================================
// PRODUTOS
// ==================================================
async function carregarProdutos() {
    try {
        const res = await fetch('/content/produtos.json');
        const data = await res.json();

        const containers = {
            burger: document.getElementById("burgers"),
            bebida: document.getElementById("bebidas")
        };

        data.produtos.forEach(prod => {
            if (!containers[prod.categoria]) return;

            const card = document.createElement("div");
            card.className = "product-card";
            card.innerHTML = `
                <img src="${prod.image || ''}">
                <h3>${prod.title}</h3>
                <p>${prod.ingredientes || ''}</p>
                <strong>R$ ${prod.price.toFixed(2).replace(".", ",")}</strong>
                <button onclick="adicionarAoCarrinho('${prod.title}','${prod.title}',${prod.price})">
                    Adicionar
                </button>
            `;
            containers[prod.categoria].appendChild(card);
        });

    } catch (e) {
        console.error("Erro ao carregar produtos", e);
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
