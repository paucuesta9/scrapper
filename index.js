const playwright = require('playwright-aws-lambda')
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const serviceSid = process.env.TWILIO_SERVICE_SID
const mobilePhone = process.env.MOBILE_PHONE

const client = require('twilio')(accountSid, authToken)

const shopsLeonardo = [
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

const shopsIPad = [
  {
    vendor: 'El Corte Inglés',
    url: 'https://www.elcorteingles.es/electronica/A41127333-ipad-102-2021-64gb-wi-fi-gris-espacial/',
    desiredPrice: '350.00',
    checkPrice: async ({ page, desiredPrice }) => {
      const content = await page.textContent('.price')
      const actualPrice = parseFloat(content.replace('€', '').replace(',', '.').trim())
      console.log('Actual price: ' + actualPrice)
      return desiredPrice >= actualPrice
    }
  },
  {
    vendor: 'El Corte Inglés',
    url: 'https://www.elcorteingles.es/electronica/A41127341-ipad-102-2021-64gb-wi-fi-plata/',
    desiredPrice: '350.00',
    checkPrice: async ({ page, desiredPrice }) => {
      const content = await page.textContent('.price')
      const actualPrice = parseFloat(content.replace('€', '').replace(',', '.').trim())
      console.log('Actual price: ' + actualPrice)
      return desiredPrice >= actualPrice
    }
  },
  {
    vendor: 'Fnac',
    url: 'https://www.fnac.es/mp9085676/IPad-Apple-10-2-9-a-generacion-64GB-gris-espacial/',
    desiredPrice: '350.00',
    checkPrice: async ({ page, desiredPrice }) => {
      const content = await page.textContent('.f-priceBox-price')
      const actualPrice = parseFloat(content.replace('€', '').replace(',', '.').trim())
      console.log('Actual price: ' + actualPrice)
      return desiredPrice >= actualPrice
    }
  },
  {
    vendor: 'PcComponentes',
    url: 'https://www.pccomponentes.com/apple-ipad-2021-102-64gb-wifi-cellular-gris-espacial',
    desiredPrice: '350.00',
    checkPrice: async ({ page, desiredPrice }) => {
      const content = await page.textContent('#precio-main')
      const actualPrice = parseFloat(content.replace('€', '').replace(',', '.').trim())
      console.log('Actual price: ' + actualPrice)
      return desiredPrice >= actualPrice
    }
  },
  {
    vendor: 'PcComponentes',
    url: 'https://www.pccomponentes.com/apple-ipad-2021-102-64gb-wifi-cellular-plata',
    desiredPrice: '350.00',
    checkPrice: async ({ page, desiredPrice }) => {
      const content = await page.textContent('#precio-main')
      const actualPrice = parseFloat(content.replace('€', '').replace(',', '.').trim())
      console.log('Actual price: ' + actualPrice)
      return desiredPrice >= actualPrice
    }
  },
  {
    vendor: 'PcComponentes',
    url: 'https://www.pccomponentes.com/apple-ipad-2021-102-64gb-wifi-gris-espacial',
    desiredPrice: '350.00',
    checkPrice: async ({ page, desiredPrice }) => {
      const content = await page.textContent('#precio-main')
      const actualPrice = parseFloat(content.replace('€', '').replace(',', '.').trim())
      console.log('Actual price: ' + actualPrice)
      return desiredPrice >= actualPrice
    }
  },
  {
    vendor: 'Carrefour',
    url: 'https://www.carrefour.es/ipad-2591-cm-102-con-wifi-64gb-apple-gris-espacial/VC4A-15583813/p',
    desiredPrice: '350.00',
    checkPrice: async ({ page, desiredPrice }) => {
      const content = await page.textContent('.buybox__price')
      const actualPrice = parseFloat(content.replace('€', '').replace(',', '.').trim())
      console.log('Actual price: ' + actualPrice)
      return desiredPrice >= actualPrice
    }
  }
]

const checkProduct = async (context, shops, product) => {
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
  console.log(desiredOn)

  if (desired.length > 0) {
    await sendEmail(product, desiredOn)
    await sendSms(product, desiredOn)
  }
}

const sendEmail = async (product, desiredOn) => {
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const msg = {
    to: process.env.SEND_EMAIL_TO_CRESSI_LEONARDO,
    from: process.env.SEND_EMAIL_FROM,
    subject: product + ' ha baixat de preu!',
    text: 'Resultats: ' + desiredOn,
    html: '<p>Resultats: ' + desiredOn + '</p><b>Developed by Pau Cuesta</b>'
  }
  await sgMail.send(msg)
}

const sendSms = async (product, desiredOn) => {
  client.messages
    .create({
      body: product + ' ha baixat de preu! Resultats: ' + desiredOn,
      messagingServiceSid: serviceSid,
      to: mobilePhone
    })
    .then(message => console.log(message.sid))
    .catch(err => console.log(err))
}

exports.handler = async (event, context) => {
  const browser = null

  try {
    const browser = await playwright.launchChromium()
    const context = await browser.newContext()

    await checkProduct(context, shopsLeonardo, 'Cressi Leonardo')
    await checkProduct(context, shopsIPad, 'iPad')
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
