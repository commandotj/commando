import React, { useState } from "react";
import { GearIcon } from "@radix-ui/react-icons";
import { Dialog, Flex, Text, Checkbox, Select } from "@radix-ui/themes";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
    setUseChecksum,
    setErrorMode,
    setDeleteMethod,
    setDeleteExtraneous,
    setDryRun,
    setResume,
} from "../../app/syncSlice";
import { saveSettings } from "../../services/settingsService";

const SyncMoreOptions: React.FC = () => {
    const dispatch = useAppDispatch();
    const options = useAppSelector(s => s.sync.options);
    const [open, setOpen] = useState(false);

    const handleOpenChange = (v: boolean) => {
        setOpen(v);
        if (!v) saveSettings(options);
    };

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Trigger>
                <button
                    type="button"
                    className="sync-btn sync-btn--ghost"
                    title="Settings"
                >
                    <GearIcon width={14} height={14} />
                </button>
            </Dialog.Trigger>
            <Dialog.Content>
                <Dialog.Title>Sync Settings</Dialog.Title>
                <Flex direction="column" gap="3" mt="3">
                    <Text size="2" weight="bold">
                        Comparison
                    </Text>
                    <Text as="label" size="2">
                        <Flex gap="2" align="center">
                            <Checkbox
                                checked={options.useChecksum}
                                onCheckedChange={v =>
                                    dispatch(setUseChecksum(!!v))
                                }
                            />
                            Content compare (checksum)
                        </Flex>
                    </Text>

                    <Text size="2" weight="bold">
                        Sync Mode
                    </Text>
                    <Text as="label" size="2">
                        <Flex gap="2" align="center">
                            <Checkbox
                                checked={options.deleteExtraneous}
                                onCheckedChange={v =>
                                    dispatch(setDeleteExtraneous(!!v))
                                }
                            />
                            Delete extraneous files
                        </Flex>
                    </Text>
                    <Text as="label" size="2">
                        <Flex gap="2" align="center">
                            <Checkbox
                                checked={options.dryRun}
                                onCheckedChange={v => dispatch(setDryRun(!!v))}
                            />
                            Dry run (no writes)
                        </Flex>
                    </Text>
                    <Text as="label" size="2">
                        <Flex gap="2" align="center">
                            <Checkbox
                                checked={options.resume ?? false}
                                onCheckedChange={v => dispatch(setResume(!!v))}
                            />
                            Resume previous sync
                        </Flex>
                    </Text>

                    <Text size="2" weight="bold">
                        Error Handling
                    </Text>
                    <Select.Root
                        value={options.errorMode ?? "ignore"}
                        onValueChange={v =>
                            dispatch(setErrorMode(v as "stop" | "ignore"))
                        }
                    >
                        <Select.Trigger />
                        <Select.Content>
                            <Select.Item value="ignore">
                                Continue on error
                            </Select.Item>
                            <Select.Item value="stop">
                                Stop on first error
                            </Select.Item>
                        </Select.Content>
                    </Select.Root>

                    <Text size="2" weight="bold">
                        Delete Method
                    </Text>
                    <Select.Root
                        value={options.deleteMethod ?? "permanent"}
                        onValueChange={v =>
                            dispatch(
                                setDeleteMethod(
                                    v as "permanent" | "trash" | "versioning"
                                )
                            )
                        }
                    >
                        <Select.Trigger />
                        <Select.Content>
                            <Select.Item value="permanent">
                                Permanent delete
                            </Select.Item>
                            <Select.Item value="trash">
                                Move to trash
                            </Select.Item>
                            <Select.Item value="versioning">
                                Keep versioned copy
                            </Select.Item>
                        </Select.Content>
                    </Select.Root>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};
export default SyncMoreOptions;
