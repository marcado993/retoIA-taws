import StepItem from '../molecules/StepItem.jsx'

export default function StepsRow({ steps }) {
  return (
    <div className="steps-row">
      {steps.map(s => <StepItem key={s.day} {...s} />)}
    </div>
  )
}
