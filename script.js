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
// BAIRROS E TAXAS POR CIDADE
// ==================================================
const bairrosJaragua = ["Centro", "Amizade", "Baependi", "Barra do Rio Cerro", "Boa Vista",
    "Czerniewicz", "Ilha da Figueira", "Jaraguá 84", "Jaraguá Esquerdo", "João Pessoa",
    "Nova Brasília", "Nereu Ramos", "Rau", "Rio Cerro I", "Rio Cerro II",
    "Rio da Luz", "Tifa Martins", "Três Rios do Sul", "Vieira", "Vila Lenzi"];

const bairrosGuaramirim = ["Centro", "Amizade", "Avaí", "Bananal do Sul", "Corticeira",
    "Figueirinha", "Guamiranga", "Imigrantes", "João Pessoa", "Nova Esperança",
    "Recanto Feliz", "Rio Branco", "Rua Nova", "Seleção", "Escolinha"];

function carregarBairros() {
    const cidade = document.getElementById("cidade").value;
    const bairroSelect = document.getElementById("bairro");
    bairroSelect.innerHTML = "";
    let lista = [];
    if (cidade === "jaragua") lista = bairrosJaragua;
    if (cidade === "guaramirim") lista = bairrosGuaramirim;

    lista.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b;
        opt.textContent = b;
        bairroSelect.appendChild(opt);
    });
}

function calcularTaxaEntrega(cidade, bairro) {
    let taxa = 0;
    if (cidade === "jaragua") taxa = 20;
    else if (cidade === "guaramirim") {
        if (bairro === "Centro") taxa = 10;
        else if (bairro === "Escolinha") taxa = 5;
        else taxa = 15;
    }
    return taxa;
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
    const existente = carrinho.find(i => i.nome === nome && i.codigo === codigo);

    if (existente) existente.quantidade++;
    else carrinho.push({ nome, codigo, preco: precoNum, quantidade: 1 });

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

        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <div class="cart-item-name">${item.quantidade}x ${item.nome}</div>
            <div class="cart-item-actions">
                <button onclick="removerItem(${index})" class="delete-btn">Excluir</button>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById("subtotal").innerText = `Subtotal: R$${subtotal.toFixed(2).replace(".", ",")}`;
    document.getElementById("total").innerText = `Total: R$${subtotal.toFixed(2).replace(".", ",")}`;
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
function abrirCarrinho() { document.getElementById("cart-modal").style.display = "flex"; }
function fecharCarrinho() { document.getElementById("cart-modal").style.display = "none"; }
function abrirDelivery() { fecharCarrinho(); document.getElementById("delivery-modal").style.display = "flex"; }
function fecharDelivery() { document.getElementById("delivery-modal").style.display = "none"; }

function toggleTroco() {
    const pagamento = document.getElementById("pagamento").value;
    document.getElementById("troco-box").style.display = pagamento === "Dinheiro" ? "block" : "none";
}

// ==================================================
// RESUMO E FINALIZAR PEDIDO
// ==================================================
function mostrarResumo() {
    const nome = document.getElementById("nomeCliente").value;
    const cidade = document.getElementById("cidade").value;
    const bairro = document.getElementById("bairro").value;
    const rua = document.getElementById("rua").value;
    const numero = document.getElementById("numero").value;
    const pagamento = document.getElementById("pagamento").value;

    if (!nome || !cidade || !bairro || !rua || !numero || !pagamento) {
        return alert("Preencha todos os campos obrigatórios antes de continuar!");
    }

    let subtotal = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
    let taxaEntrega = calcularTaxaEntrega(cidade, bairro);

    const resumoItens = document.getElementById("resumo-itens");
    resumoItens.innerHTML = "";
    carrinho.forEach(item => {
        const div = document.createElement("div");
        div.textContent = `${item.quantidade}x ${item.nome} - R$${item.preco.toFixed(2).replace(".", ",")}`;
        resumoItens.appendChild(div);
    });

    document.getElementById("resumo-taxa").innerText = `Taxa de entrega: R$${taxaEntrega},00`;
    document.getElementById("resumo-total").innerText = `Total: R$${(subtotal + taxaEntrega).toFixed(2).replace(".", ",")}`;

    document.getElementById("step1-buttons").style.display = "none";
    document.getElementById("resumo-pedido").style.display = "block";
}

function voltarFormulario() {
    document.getElementById("resumo-pedido").style.display = "none";
    document.getElementById("step1-buttons").style.display = "block";
}

function finalizarEntrega() {
    if (carrinho.length === 0) return alert("Seu carrinho está vazio!");

    const nome = document.getElementById("nomeCliente").value;
    const cidade = document.getElementById("cidade").value;
    const bairro = document.getElementById("bairro").value;
    const rua = document.getElementById("rua").value;
    const numero = document.getElementById("numero").value;
    const referencia = document.getElementById("referencia").value;
    const observacao = document.getElementById("observacao").value;
    const pagamento = document.getElementById("pagamento").value;
    const troco = document.getElementById("troco").value;

    if (!nome || !cidade || !bairro || !rua || !numero || !pagamento) {
        return alert("Preencha todos os campos obrigatórios (nome, endereço e pagamento)!");
    }

    let subtotal = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
    let taxaEntrega = calcularTaxaEntrega(cidade, bairro);
    let totalFinal = subtotal + taxaEntrega;

    let itensMsg = carrinho.map(item =>
        `• ${item.nome} - R$${item.preco.toFixed(2).replace(".", ",")} x ${item.quantidade}`
    ).join("\n");

    const mensagem =
`Olá! Gostaria de fazer meu pedido:
${itensMsg}

Cliente: ${nome}
Entrega em: ${cidade.toUpperCase()}
Bairro: ${bairro}
Rua: ${rua}, Nº ${numero}
Ref: ${referencia || "-"}
Obs: ${observacao || "-"}

Pagamento: ${pagamento}${pagamento === "Dinheiro" && troco ? " (troco para R$" + troco + ")" : ""}

Subtotal: R$${subtotal.toFixed(2).replace(".", ",")}
Taxa de entrega: R$${taxaEntrega.toFixed(2).replace(".", ",")}
Total: R$${totalFinal.toFixed(2).replace(".", ",")}

Tempo de entrega: 30 a 45 minutos`;

    const numeroWhatsApp = "5547997278232";
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
}

// ==================================================
// CARREGAR PRODUTOS DO JSON
// ==================================================
async function carregarProdutos() {
    try {
        const res = await fetch('/content/produtos.json');
        const data = await res.json();

        const containers = {
            "burger": document.getElementById("burgers"),
            "bebida": document.getElementById("bebidas")
        };

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

            if (containers[prod.categoria]) containers[prod.categoria].appendChild(card);
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

