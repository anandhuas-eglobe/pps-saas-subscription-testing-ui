import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined'
import { deleteSavedCard, listSavedCards, saveCard, setDefaultSavedCard } from '../api/cards'
import { ApiRequestError } from '../api/client'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import {
  LIST_SAVED_CARDS_SORT_FIELDS,
  SavedCardStatus,
  type SavedCardListItem,
  type SavedCardStatusValue,
} from '../types/cards'
import { formatDateTime } from '../utils/planDisplay'

function cardStatusColor(status: string): 'success' | 'warning' | 'default' {
  if (status === SavedCardStatus.ACTIVE) {
    return 'success'
  }
  if (status === SavedCardStatus.EXPIRED) {
    return 'warning'
  }
  return 'default'
}

function formatCardLabel(card: SavedCardListItem): string {
  const brand = card.brand ? card.brand.toUpperCase() : 'Card'
  return `${brand} •••• ${card.last4}`
}

export function SavedCardsPage() {
  const [cards, setCards] = useState<SavedCardListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [statusFilter, setStatusFilter] = useState<SavedCardStatusValue | ''>('')
  const [searchFilter, setSearchFilter] = useState('')
  const [sortBy, setSortBy] = useState<(typeof LIST_SAVED_CARDS_SORT_FIELDS)[number]>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [savingCard, setSavingCard] = useState(false)
  const [setupUrl, setSetupUrl] = useState<string | null>(null)
  const [actingCardId, setActingCardId] = useState<string | null>(null)

  const { transaction, execute } = useApiTransaction()

  const listQueryPayload = useMemo(
    () => ({
      page,
      limit: 10,
      status: statusFilter || undefined,
      search: searchFilter || undefined,
      sortBy,
      sortOrder,
    }),
    [page, statusFilter, searchFilter, sortBy, sortOrder],
  )

  const loadCards = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await execute(
        listQueryPayload,
        () => listSavedCards(listQueryPayload),
        'GET /api/v1/cards',
      )
      setCards(result.cards)
      setTotalPages(result.pagination.totalPages)
      setTotal(result.pagination.total)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load saved cards'
      setError(message)
      setCards([])
    } finally {
      setLoading(false)
    }
  }, [execute, listQueryPayload])

  useEffect(() => {
    void loadCards()
  }, [loadCards])

  const handleSaveCard = async () => {
    if (!agreedToTerms) {
      setActionError('You must agree to the terms and conditions before saving a card.')
      return
    }

    setSavingCard(true)
    setActionError(null)
    setActionMessage(null)
    setSetupUrl(null)
    try {
      const payload = { agreedToTerms: true as const }
      const result = await execute(payload, () => saveCard(payload), 'POST /api/v1/cards')
      setSetupUrl(result.setupUrl)
      setActionMessage('Stripe Checkout setup URL generated. Open the link to add a card.')
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to initiate save card flow'
      setActionError(message)
    } finally {
      setSavingCard(false)
    }
  }

  const handleSetDefault = async (cardId: string) => {
    setActingCardId(cardId)
    setActionError(null)
    setActionMessage(null)
    try {
      await execute({ cardId }, () => setDefaultSavedCard(cardId), `PUT /api/v1/cards/${cardId}/default`)
      setActionMessage('Default card updated successfully.')
      await loadCards()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to set default card'
      setActionError(message)
    } finally {
      setActingCardId(null)
    }
  }

  const handleDeleteCard = async (card: SavedCardListItem) => {
    if (card.isDefault) {
      setActionError('The default card cannot be deleted. Set another card as default first.')
      return
    }

    const confirmed = window.confirm(`Delete ${formatCardLabel(card)}? This cannot be undone.`)
    if (!confirmed) {
      return
    }

    setActingCardId(card.id)
    setActionError(null)
    setActionMessage(null)
    try {
      await execute({ cardId: card.id }, () => deleteSavedCard(card.id), `DELETE /api/v1/cards/${card.id}`)
      setActionMessage('Card deleted successfully.')
      await loadCards()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to delete card'
      setActionError(message)
    } finally {
      setActingCardId(null)
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Payment MS"
        title="Saved cards"
        description="Manage merchant saved Stripe cards — list, initiate save-card checkout, set default, and delete. Merchant context comes from the JWT."
        apiEndpoint="GET · POST · PUT /default · DELETE /api/v1/cards"
        backTo="/"
        backLabel="Back to home"
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void loadCards()}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Save a new card</Typography>
            <Typography variant="body2" color="text.secondary">
              Initiates a Stripe Checkout setup session. Complete the flow in the hosted page; the card
              appears here after the webhook processes the setup.
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreedToTerms}
                  onChange={(event) => setAgreedToTerms(event.target.checked)}
                />
              }
              label="I agree to the payment terms and conditions"
            />
            <Box>
              <Button
                variant="contained"
                startIcon={
                  savingCard ? <CircularProgress size={16} color="inherit" /> : <CreditCardIcon />
                }
                onClick={() => void handleSaveCard()}
                disabled={savingCard || !agreedToTerms}
              >
                Get Stripe setup URL
              </Button>
            </Box>
            {setupUrl && (
              <Alert severity="info">
                <Typography variant="body2" gutterBottom>
                  Open Stripe Checkout to add a card:
                </Typography>
                <Link href={setupUrl} target="_blank" rel="noopener noreferrer">
                  {setupUrl}
                </Link>
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Search"
                placeholder="Last4, brand, billing name or email"
                value={searchFilter}
                onChange={(event) => {
                  setSearchFilter(event.target.value)
                  setPage(1)
                }}
                fullWidth
              />
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as SavedCardStatusValue | '')
                    setPage(1)
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value={SavedCardStatus.ACTIVE}>Active</MenuItem>
                  <MenuItem value={SavedCardStatus.EXPIRED}>Expired</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Sort by</InputLabel>
                <Select
                  label="Sort by"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                >
                  {LIST_SAVED_CARDS_SORT_FIELDS.map((field) => (
                    <MenuItem key={field} value={field}>
                      {field}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Order</InputLabel>
                <Select
                  label="Order"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as 'asc' | 'desc')}
                >
                  <MenuItem value="desc">Desc</MenuItem>
                  <MenuItem value="asc">Asc</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}
            {actionError && <Alert severity="error">{actionError}</Alert>}
            {actionMessage && <Alert severity="success">{actionMessage}</Alert>}

            <Typography variant="body2" color="text.secondary">
              {total} saved card{total === 1 ? '' : 's'}
            </Typography>

            {loading ? (
              <Stack sx={{ alignItems: 'center', py: 4 }}>
                <CircularProgress />
              </Stack>
            ) : cards.length === 0 ? (
              <Alert severity="info">No saved cards found for this merchant.</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Card</TableCell>
                      <TableCell>Expiry</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Billing</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cards.map((card) => (
                      <TableRow key={card.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography variant="body2">{formatCardLabel(card)}</Typography>
                            {card.isDefault && (
                              <Chip label="Default" size="small" color="primary" variant="outlined" />
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {card.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {String(card.expMonth).padStart(2, '0')}/{card.expYear}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={card.status}
                            size="small"
                            color={cardStatusColor(card.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{card.billingName ?? '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {card.billingEmail ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDateTime(card.createdAt)}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                            {!card.isDefault && card.status === SavedCardStatus.ACTIVE && (
                              <Tooltip title="Set as default">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={actingCardId === card.id}
                                    onClick={() => void handleSetDefault(card.id)}
                                  >
                                    <StarBorderOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            <Tooltip title={card.isDefault ? 'Default card cannot be deleted' : 'Delete card'}>
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={actingCardId === card.id || card.isDefault}
                                  onClick={() => void handleDeleteCard(card)}
                                >
                                  <DeleteOutlineOutlinedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {totalPages > 1 && (
              <Stack direction="row" sx={{ justifyContent: 'center' }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_event, value) => setPage(value)}
                  color="primary"
                />
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <ApiTransactionInspector
        livePayload={listQueryPayload}
        livePayloadTitle="List cards query"
        transaction={transaction}
      />
    </Stack>
  )
}
