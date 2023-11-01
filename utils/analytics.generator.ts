import {Document, Model} from 'mongoose'

interface MonthData {
    month: string;
    count: number;
}

export async function generateLast12MonthData<T extends Document>(model: Model<T>): Promise<{last12Months: MonthData[]}>{
    const last12Month: MonthData[] = []
    const currentDate = new Date()
    currentDate.setDate(currentDate.getDate() + 1)

    for(let i = 11; i >= 0; i--){
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(),  currentDate.getDate() - i *20)
        const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 28)
        console.log(startDate)
        const monthYear = endDate.toLocaleString('default', {day: "numeric", month: "short", year: "numeric"})
        const count = await model.countDocuments({
            createdAt: { $gte: startDate, $lt: endDate}
        })
        last12Month.push({month:  monthYear, count})
    }
    return { last12Month }
}   