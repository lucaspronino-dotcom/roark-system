import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const tenants = [
  {
    dni: "90000000",
    fullName: "marinangeli, martin",
    phone: "2284000000",
    rentalAddress: "colon 2517",
  },
  {
    dni: "90000001",
    fullName: "llorente, emiliano carlos",
    phone: "2284000001",
    rentalAddress: "rivadavia 4686",
  },
  {
    dni: "90000002",
    fullName: "fuhr, juse luiz",
    phone: "2284000002",
    rentalAddress: "rivadavia 4686",
  },
  {
    dni: "90000003",
    fullName: "cuellar moreno, rosario del pilar",
    phone: "2284000003",
    rentalAddress: "rivadavia 4686",
  },
  {
    dni: "90000004",
    fullName: "gasparin, ruben dario",
    phone: "2284000004",
    rentalAddress: "vicente lopez 2195",
  },
  {
    dni: "90000005",
    fullName: "BANOVIC, ADRIANA MONICA",
    phone: "2284000005",
    rentalAddress: "del valle 3001 lavadero",
  },
  {
    dni: "90000006",
    fullName: "biondi, maria paz",
    phone: "2284000006",
    rentalAddress: "colon 2670 kiosco",
  },
]

async function main() {
  for (const tenant of tenants) {
    const personName = parsePersonName(tenant.fullName)

    await prisma.person.upsert({
      where: {
        dni: tenant.dni,
      },
      update: {
        firstName: personName.firstName,
        lastName: personName.lastName,
        phone: tenant.phone,
        tenant: {
          upsert: {
            create: {
              rentalAddress: tenant.rentalAddress,
            },
            update: {
              rentalAddress: tenant.rentalAddress,
            },
          },
        },
      },
      create: {
        firstName: personName.firstName,
        lastName: personName.lastName,
        dni: tenant.dni,
        phone: tenant.phone,
        tenant: {
          create: {
            rentalAddress: tenant.rentalAddress,
          },
        },
      },
    })
  }
}

function parsePersonName(fullName: string) {
  const [lastName = "", firstName = ""] = fullName.split(",").map((part) => part.trim())

  return {
    firstName: toTitleCase(firstName || fullName),
    lastName: toTitleCase(lastName || "Sin apellido"),
  }
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
