const playwright = require('playwright-aws-lambda')

const shops = [
  // {
  //   vendor: 'Amazon',
  //   url: 'https://www.amazon.es/Cressi-Leonardo-Ordenador-Adultos-Unisex/dp/B01873N5YO',
  //   desiredPrice: '120.00',
  //   checkPrice: async ({ page, desiredPrice }) => {
  //       //const pagina = await page.content()
  //       //console.log(pagina)
  //     //const content = await page.textContent('#newBuyBoxPrice')
  //     //const actualPrice = parseFloat(content.replace('€', '').replace(',', '.').trim())
  //     //return desiredPrice >= actualPrice
  //     return true
  //   }
  // },
  {
    vendor: 'Scubastore',
    url: 'https://www.scubastore.com/buceo-submarinismo/cressi-ordenador-leonardo/553284/p',
    desiredPrice: '120.00',
    checkPrice: async ({ page, desiredPrice }) => {
      const content = await page.textContent('#total_dinamic')
      const actualPrice = parseFloat(content.replace('€', '').replace(',', '.').trim())
      console.log('Actual price: ' + actualPrice)
      return desiredPrice >= actualPrice
    }
  },
  {
    vendor: 'Decathlon',
    url: 'https://www.decathlon.es/es/p/ordenador-de-buceo-cressi-leonardo-negro-azul/_/R-p-X8208311',
    desiredPrice: '120.00',
    checkPrice: async ({ page, desiredPrice }) => {
      const elements = await page.$$('script[type="application/ld+json"]')
      for (const element of elements) {
        const text = await page.evaluate(element => element.innerText, element)
        const JSONparsedText = JSON.parse(text)
        if (JSONparsedText['@type'] === 'Product') {
          console.log(JSONparsedText.offers[0][0].price)
          const actualPrice = parseFloat(JSONparsedText.offers[0][0].price)
          console.log('Actual price: ' + actualPrice)
          return desiredPrice >= actualPrice
        }
      }
    }
  },
  {
    vendor: 'A-Álvarez',
    url: 'https://www.a-alvarez.com/buceo/ordenadoresinterfaz/34197/ordenador-de-buceo-cressi-leonardo',
    desiredPrice: '120.00',
    checkPrice: async ({ page, desiredPrice }) => {
      const content = await page.textContent('.single-product__amount')
      const actualPrice = parseFloat(content.replace('€', '').replace(',', '.').trim())
      console.log('Actual price: ' + actualPrice)
      return desiredPrice >= actualPrice
    }
  }
]

exports.handler = async (event, context) => {
  const browser = null

  try {
    const browser = await playwright.launchChromium()
    const context = await browser.newContext()

    const desired = []
    for (const shop of shops) {
      console.log('start')
      const { checkPrice, vendor, url, desiredPrice } = shop
      console.log('new page')
      const page = await context.newPage()
      console.log('goto ' + url)
      await page.goto(url)
      console.log('check')
      const satisfies = await checkPrice({ page, desiredPrice })
      if (satisfies) desired.push(vendor + ': ' + url)
      console.log(`${vendor}: ${satisfies ? 'Product in desired price!' : 'Product not in desired price :\'('}`)
      await page.close()
    }

    const desiredOn = desired.length > 0 ? `Disponible en: ${desired.join(', ')}` : 'Product not in desired price :\'('
    if (desired.length > 0) {
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      const msg = {
        to: process.env.SEND_EMAIL_TO_CRESSI_LEONARDO,
        from: process.env.SEND_EMAIL_FROM,
        subject: 'Cressi Leonardo ha baixat de preu!',
        text: 'Resultats: ' + desiredOn,
        html: '<p>Resultats: ' + desiredOn + '</p><b>Developed by Pau Cuesta</b>'
      }
      await sgMail.send(msg)
    }

    console.log(desiredOn)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
