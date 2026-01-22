// =============================
// STATUS DA LOJA
// =============================
let LOJA_ABERTA = true;
let MENSAGEM_FECHADA = "Estamos fechados no momento 😔";

async function carregarStatusLoja() {
    try {
        const res = await fetch('/content/status.json');
        const data = await res.json();
        LOJA_ABERTA = data.aberto;
        MENSAGEM_FECHADA = data.mensagem || MENSAGEM_FECHADA;

        // texto visível no site
        const statusEl = document.getElementById("status-loja");
        if (statusEl) {
            statusEl.textContent = LOJA_ABERTA ? "🟢 ABERTO" : "🔴 FECHADO";
            statusEl.className = LOJA_ABERTA ? "aberto" : "fechado";
        }

    } catch (e) {
        console.error("Erro ao carregar status da loja", e);
    }
}

document.addEventListener("DOMContentLoaded", carregarStatusLoja);

// =============================
// ESTADO GLOBAL DO CARRINHO
// =============================
const carrinho = [];

// =============================
// SABORES
// =============================
const SABORES_SALGADOS = [
    "Frango Catupiry", "Calabresa", "Toscana", "Bacon", "Kartoffel",
    "Portuguesa", "Bacon com Milho", "Marguerita", "Calabresa Acebolada",
    "Pizza de fritas cheddar e Bacon", "Napolitana", "Milho"
];

const SABORES_DOCES = [
    "Prestígio", "Chocolate com Morango", "Banana Nevada", "Charge",
    "Confete", "Chocolate Preto", "Chocolate Branco", "Dois Amores"
];

const TODOS_SABORES = [...SABORES_SALGADOS, ...SABORES_DOCES];
const PRECO_PIZZA_DOCE_M = 25.00;

// =============================
// BEBIDAS
// =============================
const BEBIDAS = [
    { nome: "Guaraná (600ml)", preco: 0 },
    { nome: "Coca Cola 1,5L", preco: 15.00 },
    { nome: "Kuat 2L", preco: 15.00 },
    { nome: "Coca Cola Lata", preco: 6.00 },
    { nome: "Guaraná Lata", preco: 6.00 }
];

// =============================
// BAIRROS POR CIDADE
// =============================
const bairrosJaragua = [
    "Centro", "Amizade", "Baependi", "Barra do Rio Cerro", "Boa Vista",
    "Czerniewicz", "Ilha da Figueira", "Jaraguá 84", "Jaraguá Esquerdo", "João Pessoa",
    "Nova Brasília", "Nereu Ramos", "Rau", "Rio Cerro I", "Rio Cerro II",
    "Rio da Luz", "Tifa Martins", "Três Rios do Sul", "Vieira", "Vila Lenzi"
];

const bairrosGuaramirim = [
    "Centro", "Amizade", "Avaí", "Bananal do Sul", "Corticeira",
    "Figueirinha", "Guamiranga", "Imigrantes", "João Pessoa", "Nova Esperança",
    "Recanto Feliz", "Rio Branco", "Rua Nova", "Seleção", "Escolinha"
];

// =============================
// ADICIONAR PRODUTO
// =============================
function adicionarAoCarrinho(nome, codigo, preco) {
    // P027: Pizza Meio a Meio
    // ⛔ BLOQUEIO SE A LOJA ESTIVER FECHADA
    if (!LOJA_ABERTA) {
        alert(MENSAGEM_FECHADA);
        return;
    }
    if (codigo === "P027") {
        let sabor1 = prompt("Escolha o primeiro sabor:\n" + TODOS_SABORES.join(", "));
        let sabor2 = prompt("Escolha o segundo sabor:\n" + TODOS_SABORES.join(", "));
        if (!sabor1 || !sabor2) return alert("Você precisa escolher 2 sabores!");
        nome += ` (${sabor1} + ${sabor2})`;
    }

    // P026: Pizza G (3 sabores, sem bebida)
    else if (codigo === "P026") {
        let sabor1 = prompt("Escolha o primeiro sabor:\n" + TODOS_SABORES.join(", "));
        let sabor2 = prompt("Escolha o segundo sabor:\n" + TODOS_SABORES.join(", "));
        let sabor3 = prompt("Escolha o terceiro sabor:\n" + TODOS_SABORES.join(", "));
        if (!sabor1 || !sabor2 || !sabor3) return alert("Você precisa escolher 3 sabores!");
        nome += ` (${sabor1} + ${sabor2} + ${sabor3})`;
    }

    // P029: Pizza M Doce (1 sabor)
    else if (codigo === "P029") {
        let sabor = prompt("Escolha o sabor da pizza doce:\n" + SABORES_DOCES.join(", "));
        if (!sabor) return alert("Você precisa escolher 1 sabor!");
        nome += ` (${sabor})`;
        preco = PRECO_PIZZA_DOCE_M; // número puro
    }

    // P025: Combo 2 Pizzas + Bebida
    else if (codigo === "P025") {
        let sabor1 = prompt("Escolha o primeiro sabor:\n" + TODOS_SABORES.join(", "));
        let sabor2 = prompt("Escolha o segundo sabor:\n" + TODOS_SABORES.join(", "));
        if (!sabor1 || !sabor2) return alert("Você precisa escolher 2 sabores!");

        let bebidaOpcoes = BEBIDAS.map((b, i) =>
            `${i + 1} - ${b.nome} ${b.preco > 0 ? "(+R$" + b.preco.toFixed(2) + ")" : "Grátis"}`
        ).join("\n");

        let bebidaEscolha = prompt("Escolha a bebida DIGITANDO UM NÚMERO:\n\n" + bebidaOpcoes);
        let bebidaIndex = parseInt(bebidaEscolha) - 1;
        if (isNaN(bebidaIndex) || !BEBIDAS[bebidaIndex]) return alert("⚠️ Bebida inválida! Digite apenas o número da lista.");

        let bebida = BEBIDAS[bebidaIndex];
        nome += ` (${sabor1} + ${sabor2}) + ${bebida.nome}`;

        // garante que o preco seja número puro
        let precoNum = parseFloat(preco.toString().replace("R$", "").replace(",", ".")) || 0;
        preco = precoNum + bebida.preco;
    } // <-- essa chave estava faltando


    // =============================
    // PRODUTOS NORMAIS
    // =============================
    let precoNum = (typeof preco === "number") ?
        preco :
        parseFloat(preco.toString().replace("R$", "").replace(",", ".")) || 0;

    const itemExistente = carrinho.find(i => i.codigo === codigo && i.nome === nome);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({ nome, codigo, preco: precoNum, quantidade: 1 }); // só número
    }

    atualizarCarrinho();
    abrirCarrinho();
}

// =============================
// ATUALIZAR CARRINHO + SALVAR
// =============================
function atualizarCarrinho() {
    const container = document.getElementById("cart-items");
    container.innerHTML = "";

    let subtotal = 0;
    carrinho.forEach((item, index) => {
        subtotal += item.preco * item.quantidade;

        const div = document.createElement("div");
        div.classList.add("cart-item");
        div.innerHTML = `
            <div class="cart-item-name">${item.nome}</div>
            <div class="cart-item-actions">
                Qtd: ${item.quantidade}
                <button onclick="removerItem(${index})">Excluir</button>
            </div>`;
        container.appendChild(div);
    });

    document.getElementById("subtotal").innerText =
        `Subtotal: R$${subtotal.toFixed(2).replace(".", ",")}`;
    document.getElementById("total").innerText =
        `Total: R$${subtotal.toFixed(2).replace(".", ",")}`;

    // mantém os itens salvos
    localStorage.setItem("meuCarrinho", JSON.stringify(carrinho));
}


// =============================
// CONTROLES DO CARRINHO
// =============================
function abrirCarrinho() { document.getElementById("cart-modal").style.display = "flex"; }

function fecharCarrinho() { document.getElementById("cart-modal").style.display = "none"; }

function removerItem(index) { carrinho.splice(index, 1);
    atualizarCarrinho(); }

function limparCarrinho() { carrinho.length = 0;
    localStorage.removeItem("meuCarrinho");
    atualizarCarrinho(); }

// =============================
// MODAL DE ENTREGA
// =============================
function abrirDelivery() { fecharCarrinho();
    document.getElementById("delivery-modal").style.display = "flex"; }

function fecharDelivery() { document.getElementById("delivery-modal").style.display = "none"; }

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

function toggleTroco() {
    const pagamento = document.getElementById("pagamento").value;
    document.getElementById("troco-box").style.display = (pagamento === "Dinheiro") ? "block" : "none";
}

// =============================
// CALCULAR TAXA DE ENTREGA
// =============================
function calcularTaxaEntrega(cidade, bairro) {
    let taxa = 0;
    if (cidade === "jaragua") {
        taxa = 20;
    } else if (cidade === "guaramirim") {
        if (bairro === "Centro") taxa = 10;
        else if (bairro === "Escolinha") taxa = 5;
        else taxa = 15;
    }
    return taxa;
}

// =============================
// ETAPA 1 → ETAPA 2 (Resumo)
// =============================
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

    let subtotal = 0;
    carrinho.forEach(item => { subtotal += item.preco * item.quantidade; });

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

// =============================
// FINALIZAR ENTREGA (Etapa 2)
// =============================
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

    // 🔥 calcula subtotal
    let subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

    // 🔥 calcula taxa e total final
    let taxaEntrega = calcularTaxaEntrega(cidade, bairro);
    let totalFinal = subtotal + taxaEntrega;

    // 🔥 itens do carrinho
    let itensMsg = carrinho.map(item =>
        `• ${item.nome} - *R$${item.preco.toFixed(2).replace(".", ",")}* x *${item.quantidade}*`
    ).join("\n");

    // 🔥 mensagem completa com subtotal/taxa/total
    let mensagem =
        `Olá! Gostaria de fazer meu pedido:
${itensMsg}

Cliente: *${nome}*
Entrega em: *${cidade.toUpperCase()}*
Bairro: *${bairro}*
Rua: *${rua}, Nº ${numero}*
Ref: *${referencia || "-"}*
Obs: *${observacao || "-"}*

Pagamento: *${pagamento}${pagamento === "Dinheiro" && troco ? " (troco para R$" + troco + ")" : ""}*

Subtotal: *R$${subtotal.toFixed(2).replace(".", ",")}*
Taxa de entrega: *R$${taxaEntrega.toFixed(2).replace(".", ",")}*
Total: *R$${totalFinal.toFixed(2).replace(".", ",")}*

Tempo de entrega: *30 a 45 minutos*`;

    const numeroWhatsApp = "5547997032100";
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
}

// =============================
// SPLASH SCREEN
// =============================
document.addEventListener("DOMContentLoaded", () => {
    const splash = document.getElementById("splash");
    if (splash) {
        setTimeout(() => {
            splash.classList.add("hide");
            setTimeout(() => splash.style.display = "none", 500);
        }, 1500);
    }
});
// =============================
// RECARREGAR CARRINHO SALVO
// =============================
function toggleMiniCart() {
    document.getElementById("mini-cart").classList.toggle("open");
}

function atualizarMiniCart() {
    const miniCartList = document.getElementById("mini-cart-list");
    miniCartList.innerHTML = "";

    if (carrinho.length === 0) {
        miniCartList.innerHTML = "<p>Carrinho vazio</p>";
        return;
    }

    carrinho.forEach(item => {
        const div = document.createElement("div");
        div.textContent = `${item.quantidade}x ${item.nome} - R$${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}`;
        miniCartList.appendChild(div);
    });

    // total no mini carrinho
    let subtotal = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
    const totalDiv = document.createElement("div");
    totalDiv.style.marginTop = "8px";
    totalDiv.style.fontWeight = "bold";
    totalDiv.textContent = `Total: R$${subtotal.toFixed(2).replace(".", ",")}`;
    miniCartList.appendChild(totalDiv);
}
// =============================
// MENU HAMBURGUER (abre/fecha os 3 pontinhos)
// =============================
document.addEventListener("DOMContentLoaded", () => {
    const hamburger = document.getElementById("hamburger");
    const mobileMenu = document.getElementById("mobile-menu");

    if (hamburger && mobileMenu) {
        hamburger.addEventListener("click", () => {
            mobileMenu.classList.toggle("active");
        });
    }
});
// =============================
// RECARREGAR CARRINHO SALVO AO ABRIR A PÁGINA
// =============================
document.addEventListener("DOMContentLoaded", () => {
    const salvo = localStorage.getItem("meuCarrinho");
    if (salvo) {
        carrinho.push(...JSON.parse(salvo)); // repõe os itens no array
        atualizarCarrinho(); // atualiza a tela
    }
});

// RECARREGA OS PRODUTOS JSON PARA A PÁGINA DO ADMIN
async function carregarTodosProdutos() {
    try {
        const res = await fetch('content/produtos.json');
        const data = await res.json();

        const pizzasSalgadas = document.getElementById('pizzas-salgadas');
        const pizzasDoces = document.getElementById('pizzas-doces');
        const combos = document.getElementById('combos');
        const bebidas = document.getElementById('bebidas');
        const bordas = document.getElementById('bordas');
        const adicionais = document.getElementById('adicionais');

        data.produtos.forEach(prod => {
                    const card = document.createElement('div');
                    card.classList.add('product-card');

                    card.innerHTML = `
        <h3>${prod.title}</h3>
        ${prod.descricao ? `<p class="desc">${prod.descricao}</p>` : ''}
        <h4>cod: ${prod.codigo}</h4>
        <p class="price">R$${Number(prod.price).toFixed(2).replace('.', ',')}</p>
        <button class="btn"
          onclick="adicionarAoCarrinho('${prod.title}', '${prod.codigo}', ${prod.price})">
          Adicionar
        </button>
      `;

      if (prod.categoria === 'pizza-salgada' && pizzasSalgadas) pizzasSalgadas.appendChild(card);
      if (prod.categoria === 'pizza-doce' && pizzasDoces) pizzasDoces.appendChild(card);
      if (prod.categoria === 'combo' && combos) combos.appendChild(card);
      if (prod.categoria === 'bebida' && bebidas) bebidas.appendChild(card);
      if (prod.categoria === 'bordas' && bordas) bordas.appendChild(card);
      if (prod.categoria === 'adicionais' && adicionais) adicionais.appendChild(card);
    });

  } catch (e) {
    console.error('Erro ao carregar produtos:', e);
  }
}

document.addEventListener('DOMContentLoaded', carregarTodosProdutos);