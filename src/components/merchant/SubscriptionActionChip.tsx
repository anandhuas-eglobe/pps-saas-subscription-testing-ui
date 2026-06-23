import Chip from '@mui/material/Chip'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import type { SubscriptionActionValue } from '../../types/subscription'
import { SubscriptionAction } from '../../types/subscription'

export function SubscriptionActionChip({ action }: { action: SubscriptionActionValue | string }) {
  const isUpgrade = action === SubscriptionAction.UPGRADE
  const isDowngrade = action === SubscriptionAction.DOWNGRADE
  const isNew = action === SubscriptionAction.NEW

  return (
    <Chip
      icon={
        isUpgrade ? (
          <TrendingUpIcon />
        ) : isDowngrade ? (
          <TrendingDownIcon />
        ) : isNew ? (
          <AddCircleOutlineOutlinedIcon />
        ) : undefined
      }
      label={action}
      size="small"
      color={isUpgrade ? 'success' : isDowngrade ? 'warning' : 'primary'}
    />
  )
}
