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

    const existente = carrinho.find(i => i.nome === nome);

    if (existente) {
        existente.quantidade++;
    } else {
        carrinho.push({ nome, codigo, preco, quantidade: 1 });
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
        `Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}`;
    document.getElementById("total").innerText =
        `Total: R$ ${subtotal.toFixed(2).replace(".", ",")}`;
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
// PRODUTOS
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

            if (prod.categoria === "burger" && burgersEl) burgersEl.appendChild(card);
            if (prod.categoria === "bebida" && bebidasEl) bebidasEl.appendChild(card);
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
    if (hamburger && menu) hamburger.onclick = () => menu.classList.toggle("active");
}

// ==================================================
// BAIRROS
// ==================================================
const bairrosJaragua = ["Centro","Amizade","Baependi","Rau","Ilha da Figueira"];
const bairrosGuaramirim = ["Centro","Amizade","Escolinha","Avaí"];

function carregarBairros() {
    const cidade = document.getElementById("cidade").value;
    const bairroSelect = document.getElementById("bairro");

    bairroSelect.innerHTML = "<option value=''>Selecione</option>";
    const bairros = cidade === "jaragua" ? bairrosJaragua : bairrosGuaramirim;

    bairros.forEach(b => {
        const o = document.createElement("option");
        o.value = b;
        o.textContent = b;
        bairroSelect.appendChild(o);
    });
}

// ==================================================
// TROCO
// ==================================================
function toggleTroco() {
    const pagamento = document.getElementById("pagamento").value;
    document.getElementById("troco-box").style.display =
        pagamento === "Dinheiro" ? "block" : "none";
}

// ==================================================
// RESUMO
// ==================================================
function mostrarResumo() {
    const nome = nomeCliente.value;
    const cidade = document.getElementById("cidade").value;
    const bairro = document.getElementById("bairro").value;
    const rua = document.getElementById("rua").value;
    const numero = document.getElementById("numero").value;
    const pagamento = document.getElementById("pagamento").value;

    if (!nome || !cidade || !bairro || !rua || !numero || !pagamento) {
        alert("Preencha todos os campos!");
        return;
    }

    let subtotal = 0;
    carrinho.forEach(i => subtotal += i.preco * i.quantidade);

    const taxa = calcularTaxaEntrega(cidade, bairro);
    const total = subtotal + taxa;

    const resumoItens = document.getElementById("resumo-itens");
    resumoItens.innerHTML = "";

    carrinho.forEach(i => {
        resumoItens.innerHTML += `<p>${i.quantidade}x ${i.nome}</p>`;
    });

    document.getElementById("resumo-taxa").innerText =
        `Taxa de entrega: R$ ${taxa.toFixed(2).replace(".", ",")}`;
    document.getElementById("resumo-total").innerText =
        `Total: R$ ${total.toFixed(2).replace(".", ",")}`;

    let resumoPagamento = document.getElementById("resumo-pagamento");
    if (!resumoPagamento) {
        resumoPagamento = document.createElement("p");
        resumoPagamento.id = "resumo-pagamento";
        document.getElementById("resumo-pedido").appendChild(resumoPagamento);
    }
    resumoPagamento.innerHTML = `<strong>Pagamento:</strong> ${pagamento}`;

    document.getElementById("step1-buttons").style.display = "none";
    document.getElementById("resumo-pedido").style.display = "block";
}

function voltarFormulario() {
    document.getElementById("resumo-pedido").style.display = "none";
    document.getElementById("step1-buttons").style.display = "flex";
}

function calcularTaxaEntrega(cidade, bairro) {
    if (cidade === "jaragua") return 20;
    if (cidade === "guaramirim" && bairro === "Escolinha") return 5;
    return 15;
}

// ==================================================
// FINALIZAR WHATSAPP
// ==================================================
function finalizarEntrega() {
    let msg = `🛒 *NOVO PEDIDO*%0A`;
    carrinho.forEach(i => msg += `• ${i.quantidade}x ${i.nome}%0A`);
    msg += `%0A💳 Pagamento: ${pagamento.value}`;

    window.open(`https://wa.me/5547997278232?text=${msg}`, "_blank");
    limparCarrinho();
    fecharDelivery();
}

// ==================================================
// INIT
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
    carregarStatusLoja();
    carregarCarrinhoSalvo();
    atualizarCarrinho();
    carregarProdutos();
    initMenuMobile();
    initSplash(); // 🔥 ISSO AQUI É O QUE DESBLOQUEIA
});

function initSplash() {
    const splash = document.getElementById("splash");
    if (!splash) return;

    setTimeout(() => {
        splash.classList.add("hide");

        setTimeout(() => {
            splash.style.display = "none";
        }, 500);

    }, 1500);
}



