import { PrismaClient } from "@prisma/client"
import { ContractStatus } from "@prisma/client"

const prisma = new PrismaClient()

const contracts = [
  {
    dni: "90000000",
    endDate: "31/12/2027",
    folder: "0",
    fullName: "marinangeli, martin",
    ownerDni: "91000000",
    ownerName: "ranni, abel ernesto",
    phone: "2284000000",
    rentalAddress: "colon 2517",
    status: ContractStatus.ACTIVE,
  },
  {
    dni: "90000001",
    endDate: "31/8/2025",
    folder: "1",
    fullName: "llorente, emiliano carlos",
    ownerDni: "91000000",
    ownerName: "ranni, abel ernesto",
    phone: "2284000001",
    rentalAddress: "rivadavia 4686",
    status: ContractStatus.EXPIRED,
  },
  {
    dni: "90000002",
    endDate: "31/1/2028",
    folder: "1",
    fullName: "fuhr, juse luiz",
    ownerDni: "91000000",
    ownerName: "ranni, abel ernesto",
    phone: "2284000002",
    rentalAddress: "rivadavia 4686",
    status: ContractStatus.ACTIVE,
  },
  {
    dni: "90000003",
    endDate: "31/5/2027",
    folder: "2",
    fullName: "cuellar moreno, rosario del pilar",
    ownerDni: "91000000",
    ownerName: "ranni, abel ernesto",
    phone: "2284000003",
    rentalAddress: "rivadavia 4686",
    status: ContractStatus.ACTIVE,
  },
  {
    dni: "90000004",
    endDate: "30/4/2026",
    folder: "3",
    fullName: "gasparin, ruben dario",
    ownerDni: "91000001",
    ownerName: "rossi, ana maria",
    phone: "2284000004",
    rentalAddress: "vicente lopez 2195",
    status: ContractStatus.EXPIRED,
  },
  {
    dni: "90000004",
    endDate: "30/4/2028",
    folder: "3",
    fullName: "gasparin, ruben dario",
    ownerDni: "91000001",
    ownerName: "rossi, ana maria",
    phone: "2284000004",
    rentalAddress: "av. Del valle 2696",
    status: ContractStatus.ACTIVE,
  },
  {
    dni: "90000005",
    endDate: "31/8/2027",
    folder: "4",
    fullName: "BANOVIC, ADRIANA MONICA",
    ownerDni: "91000001",
    ownerName: "rossi, ana maria",
    phone: "2284000005",
    rentalAddress: "del valle 3001 lavadero",
    status: ContractStatus.ACTIVE,
  },
  {
    dni: "90000006",
    endDate: "31/8/2026",
    folder: "5",
    fullName: "biondi, maria paz",
    ownerDni: "91000001",
    ownerName: "rossi, ana maria",
    phone: "2284000006",
    rentalAddress: "colon 2670 kiosco",
    status: ContractStatus.ACTIVE,
  },
]

async function main() {
  for (const contract of contracts) {
    const tenantPersonName = parsePersonName(contract.fullName)
    const ownerPersonName = parsePersonName(contract.ownerName)

    const tenantPerson = await prisma.person.upsert({
      where: {
        dni: contract.dni,
      },
      update: {
        firstName: tenantPersonName.firstName,
        lastName: tenantPersonName.lastName,
        phone: contract.phone,
      },
      create: {
        firstName: tenantPersonName.firstName,
        lastName: tenantPersonName.lastName,
        dni: contract.dni,
        phone: contract.phone,
      },
    })

    const tenant = await prisma.tenant.upsert({
      where: {
        personId: tenantPerson.id,
      },
      update: {
        rentalAddress: contract.rentalAddress,
      },
      create: {
        personId: tenantPerson.id,
        rentalAddress: contract.rentalAddress,
      },
    })

    const ownerPerson = await prisma.person.upsert({
      where: {
        dni: contract.ownerDni,
      },
      update: {
        firstName: ownerPersonName.firstName,
        lastName: ownerPersonName.lastName,
        phone: `2284${contract.ownerDni.slice(-6)}`,
      },
      create: {
        firstName: ownerPersonName.firstName,
        lastName: ownerPersonName.lastName,
        dni: contract.ownerDni,
        phone: `2284${contract.ownerDni.slice(-6)}`,
      },
    })

    const owner = await prisma.owner.upsert({
      where: {
        personId: ownerPerson.id,
      },
      update: {},
      create: {
        personId: ownerPerson.id,
      },
    })

    const property = await prisma.property.upsert({
      where: {
        folder_address: {
          folder: contract.folder,
          address: contract.rentalAddress,
        },
      },
      update: {
        ownerId: owner.id,
      },
      create: {
        folder: contract.folder,
        address: contract.rentalAddress,
        ownerId: owner.id,
      },
    })

    const existingContract = await prisma.contract.findFirst({
      where: {
        folder: contract.folder,
        propertyId: property.id,
        tenantId: tenant.id,
      },
    })

    const contractData = {
      endDate: parseDate(contract.endDate),
      folder: contract.folder,
      ownerId: owner.id,
      propertyId: property.id,
      status: contract.status,
      tenantId: tenant.id,
    }

    if (existingContract) {
      await prisma.contract.update({
        where: {
          id: existingContract.id,
        },
        data: contractData,
      })
    } else {
      await prisma.contract.create({
        data: contractData,
      })
    }
  }
}

function parsePersonName(fullName: string) {
  const [lastName = "", firstName = ""] = fullName.split(",").map((part) => part.trim())

  return {
    firstName: toTitleCase(firstName || fullName),
    lastName: toTitleCase(lastName || "Sin apellido"),
  }
}

function parseDate(value: string) {
  const [day, month, year] = value.split("/").map(Number)

  return new Date(Date.UTC(year, month - 1, day))
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
